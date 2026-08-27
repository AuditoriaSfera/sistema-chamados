"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { podeGerenciarAlvo, type SessionUser } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

const ERRO_ALVO_ADMIN = "Seu perfil não pode alterar o cadastro de um administrador.";
const ERRO_PERFIL_ADMIN = "Seu perfil não pode atribuir um perfil administrativo.";

/**
 * Recusa a ação quando o alvo é uma conta administrativa e quem age não é
 * administrador pleno. Devolve a mensagem de erro, ou null para seguir.
 *
 * Sem isso, quem só deveria gerenciar cadastros comuns tomaria a conta de um
 * administrador pelo caminho mais curto: redefinir a senha dele na tela de
 * edição, ou trocar o próprio perfil por um mais poderoso.
 */
async function barraAlvoAdministrativo(ator: SessionUser, usuarioId: string) {
  if (ator.podeGerenciarAdministradores) return null;
  const alvo = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { perfil: true },
  });
  if (!alvo) return "Usuário não encontrado.";
  const perfilAlvo = await prisma.perfilAcesso.findUnique({ where: { id: alvo.perfil } });
  if (!perfilAlvo) return "Perfil do usuário não encontrado.";
  return podeGerenciarAlvo(ator, perfilAlvo) ? null : ERRO_ALVO_ADMIN;
}

/** Versão para as ações que não devolvem estado de erro para o formulário. */
async function exigirAlvoGerenciavel(ator: SessionUser, usuarioId: string) {
  const erro = await barraAlvoAdministrativo(ator, usuarioId);
  if (erro) throw new Error(erro);
}

// Telefone: aceita formatos brasileiros comuns, com ou sem máscara.
const telefoneSchema = z
  .string()
  .min(1, "Informe o telefone de contato.")
  .refine((v) => v.replace(/\D/g, "").length >= 10, {
    message: "Telefone incompleto — inclua o DDD.",
  });

const emailContatoSchema = z
  .string()
  .min(1, "Informe o e-mail de contato.")
  .email("E-mail de contato inválido.")
  .transform((v) => v.trim().toLowerCase());

const usuarioSchema = z.object({
  nome: z.string().min(1),
  email: z.string().min(1),
  emailContato: emailContatoSchema,
  telefone: telefoneSchema,
  senha: z.string().min(6),
  perfil: z.string().min(1),
});

export async function createUsuario(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const admin = await requireAdmin();
  const parsed = usuarioSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    emailContato: formData.get("emailContato"),
    telefone: formData.get("telefone"),
    senha: formData.get("senha"),
    perfil: formData.get("perfil"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos (senha mínima de 6 caracteres)." };
  }

  const perfilValido = await prisma.perfilAcesso.findUnique({ where: { id: parsed.data.perfil } });
  if (!perfilValido) return { error: "Perfil inválido." };
  if (!podeGerenciarAlvo(admin, perfilValido)) return { error: ERRO_PERFIL_ADMIN };

  // o login e o e-mail entram no mesmo campo na tela de login, então nenhum dos
  // dois pode colidir com o do outro usuário
  const exists = await prisma.usuario.findFirst({
    where: {
      OR: [
        { email: { equals: parsed.data.email, mode: "insensitive" } },
        { email: { equals: parsed.data.emailContato, mode: "insensitive" } },
        { emailContato: { equals: parsed.data.email, mode: "insensitive" } },
        { emailContato: { equals: parsed.data.emailContato, mode: "insensitive" } },
      ],
    },
  });
  if (exists) return { error: "Já existe usuário com esse login ou e-mail." };

  const senhaHash = await bcrypt.hash(parsed.data.senha, 10);
  const usuario = await prisma.usuario.create({
    data: {
      nome: parsed.data.nome,
      email: parsed.data.email,
      emailContato: parsed.data.emailContato,
      telefone: parsed.data.telefone,
      senhaHash,
      perfil: parsed.data.perfil,
      senhaProvisoria: true,
    },
  });
  await logAudit("Usuario", usuario.id, "CREATE", admin.id, {
    nome: parsed.data.nome,
    email: parsed.data.email,
    perfil: parsed.data.perfil,
  });

  revalidatePath("/cadastros/usuarios");
  return {};
}

export async function toggleUsuarioAtivo(usuarioId: string, ativo: boolean) {
  const admin = await requireAdmin();
  await exigirAlvoGerenciavel(admin, usuarioId);
  await prisma.usuario.update({ where: { id: usuarioId }, data: { ativo } });
  await logAudit("Usuario", usuarioId, ativo ? "ATIVAR" : "DESATIVAR", admin.id);
  revalidatePath("/cadastros/usuarios");
}

const usuarioUpdateSchema = z.object({
  nome: z.string().min(1),
  email: z.string().min(1),
  emailContato: emailContatoSchema,
  telefone: telefoneSchema,
  perfil: z.string().min(1),
  senha: z.union([z.string().min(6), z.literal("")]).optional(),
});

export async function updateUsuario(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const admin = await requireAdmin();
  const usuarioId = formData.get("usuarioId") as string;
  const parsed = usuarioUpdateSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    emailContato: formData.get("emailContato"),
    telefone: formData.get("telefone"),
    perfil: formData.get("perfil"),
    senha: formData.get("senha") || undefined,
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Verifique os campos (a nova senha, se preenchida, precisa de 6+ caracteres).",
    };
  }

  // Dois lados a conferir: o cadastro que está sendo alterado e o perfil que
  // se quer atribuir. Barrar só o primeiro deixaria promover um usuário comum
  // a administrador; barrar só o segundo deixaria rebaixar um administrador.
  const bloqueio = await barraAlvoAdministrativo(admin, usuarioId);
  if (bloqueio) return { error: bloqueio };

  const perfilValido = await prisma.perfilAcesso.findUnique({ where: { id: parsed.data.perfil } });
  if (!perfilValido) return { error: "Perfil inválido." };
  if (!podeGerenciarAlvo(admin, perfilValido)) return { error: ERRO_PERFIL_ADMIN };

  const existe = await prisma.usuario.findFirst({
    where: {
      NOT: { id: usuarioId },
      OR: [
        { email: { equals: parsed.data.email, mode: "insensitive" } },
        { email: { equals: parsed.data.emailContato, mode: "insensitive" } },
        { emailContato: { equals: parsed.data.email, mode: "insensitive" } },
        { emailContato: { equals: parsed.data.emailContato, mode: "insensitive" } },
      ],
    },
  });
  if (existe) return { error: "Já existe usuário com esse login ou e-mail." };

  const data: {
    nome: string;
    email: string;
    emailContato: string;
    telefone: string;
    perfil: string;
    senhaHash?: string;
  } = {
    nome: parsed.data.nome,
    email: parsed.data.email,
    emailContato: parsed.data.emailContato,
    telefone: parsed.data.telefone,
    perfil: parsed.data.perfil,
  };
  if (parsed.data.senha) data.senhaHash = await bcrypt.hash(parsed.data.senha, 10);

  await prisma.usuario.update({ where: { id: usuarioId }, data });
  await logAudit("Usuario", usuarioId, "ATUALIZAR", admin.id, {
    nome: parsed.data.nome,
    email: parsed.data.email,
    perfil: parsed.data.perfil,
  });

  revalidatePath("/cadastros/usuarios");
  return {};
}

export async function deleteUsuario(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const admin = await requireAdmin();
  const usuarioId = formData.get("usuarioId") as string;

  if (usuarioId === admin.id) {
    return { error: "Você não pode excluir sua própria conta." };
  }

  const bloqueio = await barraAlvoAdministrativo(admin, usuarioId);
  if (bloqueio) return { error: bloqueio };

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      _count: {
        select: { chamadosAbertos: true, chamadosAtendidos: true, mensagens: true, statusHistoricos: true },
      },
    },
  });
  if (!usuario) return { error: "Usuário não encontrado." };
  const emUso =
    usuario._count.chamadosAbertos +
    usuario._count.chamadosAtendidos +
    usuario._count.mensagens +
    usuario._count.statusHistoricos;
  if (emUso > 0) {
    return {
      error: "Não é possível excluir: este usuário tem chamados ou mensagens vinculados. Desative-o em vez de excluir.",
    };
  }

  await prisma.usuarioPdv.deleteMany({ where: { usuarioId } });
  await prisma.usuario.delete({ where: { id: usuarioId } });
  await logAudit("Usuario", usuarioId, "DELETE", admin.id, { nome: usuario.nome, email: usuario.email });

  revalidatePath("/cadastros/usuarios");
  return {};
}

export async function setUsuarioPdvVinculo(usuarioId: string, pdvId: string, vinculado: boolean) {
  const admin = await requireAdmin();
  await exigirAlvoGerenciavel(admin, usuarioId);
  if (vinculado) {
    await prisma.usuarioPdv.upsert({
      where: { usuarioId_pdvId: { usuarioId, pdvId } },
      update: {},
      create: { usuarioId, pdvId },
    });
  } else {
    await prisma.usuarioPdv.deleteMany({ where: { usuarioId, pdvId } });
  }
  await logAudit("UsuarioPdv", usuarioId, vinculado ? "VINCULAR_PDV" : "DESVINCULAR_PDV", admin.id, {
    pdvId,
  });
  revalidatePath(`/cadastros/usuarios/${usuarioId}`);
}

export async function setUsuarioPdvVinculoTodos(
  usuarioId: string,
  pdvIds: string[],
  vinculado: boolean
) {
  const admin = await requireAdmin();
  await exigirAlvoGerenciavel(admin, usuarioId);
  if (vinculado) {
    await prisma.$transaction(
      pdvIds.map((pdvId) =>
        prisma.usuarioPdv.upsert({
          where: { usuarioId_pdvId: { usuarioId, pdvId } },
          update: {},
          create: { usuarioId, pdvId },
        })
      )
    );
  } else {
    await prisma.usuarioPdv.deleteMany({ where: { usuarioId, pdvId: { in: pdvIds } } });
  }
  await logAudit(
    "UsuarioPdv",
    usuarioId,
    vinculado ? "VINCULAR_PDV_TODOS" : "DESVINCULAR_PDV_TODOS",
    admin.id,
    { pdvIds }
  );
  revalidatePath(`/cadastros/usuarios/${usuarioId}`);
  revalidatePath("/cadastros/usuarios");
}

export async function setUsuarioVePedidosDaEquipe(usuarioId: string, valor: boolean) {
  const admin = await requireAdmin();
  await exigirAlvoGerenciavel(admin, usuarioId);
  await prisma.usuario.update({ where: { id: usuarioId }, data: { vePedidosDaEquipe: valor } });
  await logAudit("Usuario", usuarioId, "ATUALIZAR_VE_PEDIDOS_EQUIPE", admin.id, { valor });
  revalidatePath(`/cadastros/usuarios/${usuarioId}`);
}

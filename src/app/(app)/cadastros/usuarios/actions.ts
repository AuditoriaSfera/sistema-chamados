"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

const usuarioSchema = z.object({
  nome: z.string().min(1),
  email: z.string().min(1),
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
    senha: formData.get("senha"),
    perfil: formData.get("perfil"),
  });
  if (!parsed.success) return { error: "Verifique os campos (senha mínima de 6 caracteres)." };

  const perfilValido = await prisma.perfilAcesso.findUnique({ where: { id: parsed.data.perfil } });
  if (!perfilValido) return { error: "Perfil inválido." };

  const exists = await prisma.usuario.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { error: "Usuário já cadastrado." };

  const senhaHash = await bcrypt.hash(parsed.data.senha, 10);
  const usuario = await prisma.usuario.create({
    data: {
      nome: parsed.data.nome,
      email: parsed.data.email,
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
  await prisma.usuario.update({ where: { id: usuarioId }, data: { ativo } });
  await logAudit("Usuario", usuarioId, ativo ? "ATIVAR" : "DESATIVAR", admin.id);
  revalidatePath("/cadastros/usuarios");
}

const usuarioUpdateSchema = z.object({
  nome: z.string().min(1),
  email: z.string().min(1),
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
    perfil: formData.get("perfil"),
    senha: formData.get("senha") || undefined,
  });
  if (!parsed.success) {
    return { error: "Verifique os campos (a nova senha, se preenchida, precisa de 6+ caracteres)." };
  }

  const perfilValido = await prisma.perfilAcesso.findUnique({ where: { id: parsed.data.perfil } });
  if (!perfilValido) return { error: "Perfil inválido." };

  const existe = await prisma.usuario.findFirst({
    where: { email: parsed.data.email, NOT: { id: usuarioId } },
  });
  if (existe) return { error: "Usuário já cadastrado." };

  const data: { nome: string; email: string; perfil: string; senhaHash?: string } = {
    nome: parsed.data.nome,
    email: parsed.data.email,
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
  await prisma.usuario.update({ where: { id: usuarioId }, data: { vePedidosDaEquipe: valor } });
  await logAudit("Usuario", usuarioId, "ATUALIZAR_VE_PEDIDOS_EQUIPE", admin.id, { valor });
  revalidatePath(`/cadastros/usuarios/${usuarioId}`);
}

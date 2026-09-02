"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { isPerfilAdministrativo, type SessionUser } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { proximaCor } from "@/lib/color-palette";

const perfilSchema = z.object({
  nome: z.string().min(1),
  podeAbrirChamado: z.boolean(),
  podeAlterarStatus: z.boolean(),
  podeResponderChat: z.boolean(),
  podeCancelarReabrirProprio: z.boolean(),
  podeCancelarReabrirTodos: z.boolean(),
  podeVerRelatorios: z.boolean(),
  podeGerenciarCadastros: z.boolean(),
  podeGerenciarAdministradores: z.boolean(),
  veSomenteProprios: z.boolean(),
});

function parsePermissoes(formData: FormData) {
  return perfilSchema.safeParse({
    nome: formData.get("nome"),
    podeAbrirChamado: formData.get("podeAbrirChamado") === "on",
    podeAlterarStatus: formData.get("podeAlterarStatus") === "on",
    podeResponderChat: formData.get("podeResponderChat") === "on",
    podeCancelarReabrirProprio: formData.get("podeCancelarReabrirProprio") === "on",
    podeCancelarReabrirTodos: formData.get("podeCancelarReabrirTodos") === "on",
    podeVerRelatorios: formData.get("podeVerRelatorios") === "on",
    podeGerenciarCadastros: formData.get("podeGerenciarCadastros") === "on",
    podeGerenciarAdministradores: formData.get("podeGerenciarAdministradores") === "on",
    veSomenteProprios: formData.get("veSomenteProprios") === "on",
  });
}

const ERRO_CONCEDER_ADMIN =
  "Seu perfil não pode conceder as permissões de administração a um perfil.";
const ERRO_EDITAR_PERFIL_ADMIN = "Seu perfil não pode alterar um perfil administrativo.";

/**
 * As duas permissões que fabricam um administrador. Conceder qualquer uma
 * delas é criar uma conta tão poderosa quanto a de quem concede — ou mais —,
 * então fica restrito a administrador pleno. Sem essa trava, um perfil que só
 * deveria gerenciar cadastros criaria um perfil novo com acesso total e o
 * atribuiria a um usuário qualquer.
 */
function concedeAdministracao(dados: {
  podeGerenciarCadastros: boolean;
  podeGerenciarAdministradores: boolean;
}) {
  return dados.podeGerenciarCadastros || dados.podeGerenciarAdministradores;
}

function barraConcessaoAdministrativa(
  ator: SessionUser,
  dados: { podeGerenciarCadastros: boolean; podeGerenciarAdministradores: boolean }
) {
  if (ator.podeGerenciarAdministradores) return null;
  return concedeAdministracao(dados) ? ERRO_CONCEDER_ADMIN : null;
}

/** Recusa mexer num perfil administrativo já existente. */
async function barraPerfilAdministrativo(ator: SessionUser, perfilId: string) {
  if (ator.podeGerenciarAdministradores) return null;
  const perfil = await prisma.perfilAcesso.findUnique({ where: { id: perfilId } });
  if (!perfil) return "Perfil não encontrado.";
  return isPerfilAdministrativo(perfil) ? ERRO_EDITAR_PERFIL_ADMIN : null;
}

export async function createPerfil(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const parsed = parsePermissoes(formData);
  if (!parsed.success) return { error: "Preencha os campos corretamente." };

  const bloqueio = barraConcessaoAdministrativa(user, parsed.data);
  if (bloqueio) return { error: bloqueio };

  const existe = await prisma.perfilAcesso.findFirst({ where: { nome: parsed.data.nome } });
  if (existe) return { error: "Já existe um perfil com esse nome." };

  const quantidade = await prisma.perfilAcesso.count();
  const perfil = await prisma.perfilAcesso.create({
    data: { ...parsed.data, cor: proximaCor(quantidade), ordem: quantidade },
  });
  await logAudit("PerfilAcesso", perfil.id, "CREATE", user.id, parsed.data);

  revalidatePath("/cadastros/perfis");
  return {};
}

export async function updatePerfil(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const perfilId = formData.get("perfilId") as string;
  const parsed = parsePermissoes(formData);
  if (!parsed.success) return { error: "Preencha os campos corretamente." };

  // Duas travas: não mexer num perfil que já é administrativo (inclusive o do
  // próprio ator, que seria o caminho direto de auto-promoção) e não transformar
  // um perfil comum em administrativo.
  const bloqueioAlvo = await barraPerfilAdministrativo(user, perfilId);
  if (bloqueioAlvo) return { error: bloqueioAlvo };
  const bloqueioConcessao = barraConcessaoAdministrativa(user, parsed.data);
  if (bloqueioConcessao) return { error: bloqueioConcessao };

  const existe = await prisma.perfilAcesso.findFirst({
    where: { nome: parsed.data.nome, NOT: { id: perfilId } },
  });
  if (existe) return { error: "Já existe um perfil com esse nome." };

  await prisma.perfilAcesso.update({ where: { id: perfilId }, data: parsed.data });
  await logAudit("PerfilAcesso", perfilId, "ATUALIZAR", user.id, parsed.data);

  revalidatePath("/cadastros/perfis");
  return {};
}

export async function togglePerfilAtivo(perfilId: string, ativo: boolean) {
  const user = await requireAdmin();
  const bloqueio = await barraPerfilAdministrativo(user, perfilId);
  if (bloqueio) throw new Error(bloqueio);
  await prisma.perfilAcesso.update({ where: { id: perfilId }, data: { ativo } });
  await logAudit("PerfilAcesso", perfilId, ativo ? "ATIVAR" : "INATIVAR", user.id);
  revalidatePath("/cadastros/perfis");
}

export async function deletePerfil(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const perfilId = formData.get("perfilId") as string;

  const perfil = await prisma.perfilAcesso.findUnique({ where: { id: perfilId } });
  if (!perfil) return { error: "Perfil não encontrado." };
  if (!user.podeGerenciarAdministradores && isPerfilAdministrativo(perfil)) {
    return { error: ERRO_EDITAR_PERFIL_ADMIN };
  }

  const emUso = await prisma.usuario.count({ where: { perfil: perfilId } });
  if (emUso > 0) {
    return {
      error: "Não é possível excluir: existem usuários com esse perfil. Inative-o em vez de excluir.",
    };
  }

  await prisma.perfilAcesso.delete({ where: { id: perfilId } });
  await logAudit("PerfilAcesso", perfilId, "DELETE", user.id, { nome: perfil.nome });

  revalidatePath("/cadastros/perfis");
  return {};
}

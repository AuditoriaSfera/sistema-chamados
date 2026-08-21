"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
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
  veTodosChamados: z.boolean(),
  veChamadosPdvsVinculados: z.boolean(),
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
    veTodosChamados: formData.get("veTodosChamados") === "on",
    veChamadosPdvsVinculados: formData.get("veChamadosPdvsVinculados") === "on",
  });
}

export async function createPerfil(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const parsed = parsePermissoes(formData);
  if (!parsed.success) return { error: "Preencha os campos corretamente." };

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

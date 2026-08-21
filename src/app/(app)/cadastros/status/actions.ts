"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { COLOR_PALETTE } from "@/lib/color-palette";

const statusSchema = z.object({ nome: z.string().min(1) });

function corAleatoria() {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

export async function createStatus(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const parsed = statusSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) return { error: "Informe o nome do status." };

  const existente = await prisma.status.findFirst({ where: { nome: parsed.data.nome } });
  if (existente) return { error: "Já existe um status com esse nome." };

  const total = await prisma.status.count();
  const cor = corAleatoria();
  const status = await prisma.status.create({
    data: { nome: parsed.data.nome, cor, ordem: total },
  });
  await logAudit("Status", status.id, "CREATE", user.id, { nome: status.nome, cor });
  revalidatePath("/cadastros/status");
  return {};
}

export async function updateStatusNome(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const statusId = formData.get("statusId") as string;
  const parsed = statusSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) return { error: "Informe o nome do status." };

  const status = await prisma.status.findUnique({ where: { id: statusId } });
  if (!status) return { error: "Status não encontrado." };
  if (status.fixo) return { error: "Este status é fixo e não pode ser editado." };

  const duplicado = await prisma.status.findFirst({
    where: { nome: parsed.data.nome, NOT: { id: statusId } },
  });
  if (duplicado) return { error: "Já existe um status com esse nome." };

  await prisma.status.update({ where: { id: statusId }, data: { nome: parsed.data.nome } });
  await logAudit("Status", statusId, "ATUALIZAR", user.id, parsed.data);
  revalidatePath("/cadastros/status");
  return {};
}

export async function toggleStatusAtivo(statusId: string, ativo: boolean) {
  const user = await requireAdmin();
  const status = await prisma.status.findUnique({ where: { id: statusId } });
  if (!status || status.fixo) return;
  await prisma.status.update({ where: { id: statusId }, data: { ativo } });
  await logAudit("Status", statusId, ativo ? "ATIVAR" : "INATIVAR", user.id);
  revalidatePath("/cadastros/status");
}

export async function deleteStatus(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const statusId = formData.get("statusId") as string;

  const status = await prisma.status.findUnique({ where: { id: statusId } });
  if (!status) return { error: "Status não encontrado." };
  if (status.fixo) return { error: "Este status é fixo e não pode ser excluído." };

  const [emUso, historico] = await Promise.all([
    prisma.chamado.count({ where: { status: statusId } }),
    prisma.statusHistorico.count({ where: { status: statusId } }),
  ]);
  if (emUso > 0 || historico > 0) {
    return {
      error:
        "Não é possível excluir: este status já foi usado em algum chamado. Inative-o em vez de excluir.",
    };
  }

  await prisma.status.delete({ where: { id: statusId } });
  await logAudit("Status", statusId, "DELETE", user.id, { nome: status.nome });
  revalidatePath("/cadastros/status");
  return {};
}

"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { proximaCor } from "@/lib/color-palette";
import { UNIDADES_SLA } from "@/lib/sla-format";

const slaSchema = z.object({
  nome: z.string().min(1),
  duracao: z.coerce.number().int().positive(),
  unidade: z.enum(UNIDADES_SLA),
});

export async function createSlaPreset(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const parsed = slaSchema.safeParse({
    nome: formData.get("nome"),
    duracao: formData.get("duracao"),
    unidade: formData.get("unidade"),
  });
  if (!parsed.success) return { error: "Preencha os campos corretamente." };
  const critica = formData.get("critica") === "on";

  const existe = await prisma.slaPreset.findFirst({ where: { nome: parsed.data.nome } });
  if (existe) return { error: "Já existe um SLA com esse nome." };

  const quantidade = await prisma.slaPreset.count();
  await prisma.$transaction(async (tx) => {
    if (critica) await tx.slaPreset.updateMany({ data: { critica: false }, where: {} });
    const sla = await tx.slaPreset.create({
      data: { ...parsed.data, critica, cor: proximaCor(quantidade), ordem: quantidade },
    });
    await logAudit("SlaPreset", sla.id, "CREATE", user.id, { ...parsed.data, critica });
  });
  revalidatePath("/cadastros/sla");
  return {};
}

export async function updateSlaPresetInfo(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const slaId = formData.get("slaId") as string;
  const parsed = slaSchema.safeParse({
    nome: formData.get("nome"),
    duracao: formData.get("duracao"),
    unidade: formData.get("unidade"),
  });
  if (!parsed.success) return { error: "Preencha os campos corretamente." };
  const critica = formData.get("critica") === "on";

  const existe = await prisma.slaPreset.findFirst({
    where: { nome: parsed.data.nome, NOT: { id: slaId } },
  });
  if (existe) return { error: "Já existe um SLA com esse nome." };

  await prisma.$transaction([
    ...(critica ? [prisma.slaPreset.updateMany({ data: { critica: false }, where: {} })] : []),
    prisma.slaPreset.update({ where: { id: slaId }, data: { ...parsed.data, critica } }),
  ]);
  await logAudit("SlaPreset", slaId, "ATUALIZAR", user.id, { ...parsed.data, critica });
  revalidatePath("/cadastros/sla");
  return {};
}

export async function toggleSlaPresetAtivo(slaId: string, ativo: boolean) {
  const user = await requireAdmin();
  await prisma.slaPreset.update({ where: { id: slaId }, data: { ativo } });
  await logAudit("SlaPreset", slaId, ativo ? "ATIVAR" : "INATIVAR", user.id);
  revalidatePath("/cadastros/sla");
}

export async function deleteSlaPreset(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const slaId = formData.get("slaId") as string;

  const sla = await prisma.slaPreset.findUnique({
    where: { id: slaId },
    include: { _count: { select: { servicos: true, chamados: true } } },
  });
  if (!sla) return { error: "SLA não encontrado." };
  if (sla._count.servicos > 0 || sla._count.chamados > 0) {
    return {
      error:
        "Não é possível excluir: este SLA está em uso em algum serviço ou chamado. Inative-o em vez de excluir.",
    };
  }

  await prisma.slaPreset.delete({ where: { id: slaId } });
  await logAudit("SlaPreset", slaId, "DELETE", user.id, { nome: sla.nome });
  revalidatePath("/cadastros/sla");
  return {};
}

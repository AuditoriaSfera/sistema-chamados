"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CATEGORIAS_SERVICO } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

// Categoria não é perguntada na criação — entra com um valor padrão e pode
// ser ajustada depois em "Editar serviço".
const CATEGORIA_PADRAO = CATEGORIAS_SERVICO[0];

const servicoCreateSchema = z.object({
  nome: z.string().min(1),
  textoOrientacao: z.string().optional(),
  slaPresetId: z.string().min(1),
});

export async function createServico(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const parsed = servicoCreateSchema.safeParse({
    nome: formData.get("nome"),
    textoOrientacao: formData.get("textoOrientacao") || undefined,
    slaPresetId: formData.get("slaPresetId"),
  });
  if (!parsed.success) return { error: "Preencha os campos obrigatórios corretamente." };

  const data = { ...parsed.data, categoria: CATEGORIA_PADRAO };
  const servico = await prisma.servico.create({ data });
  await logAudit("Servico", servico.id, "CREATE", user.id, data);

  revalidatePath("/cadastros/servicos");
  return {};
}

export async function toggleServicoAtivo(servicoId: string, ativo: boolean) {
  const user = await requireAdmin();
  await prisma.servico.update({ where: { id: servicoId }, data: { ativo } });
  await logAudit("Servico", servicoId, ativo ? "ATIVAR" : "INATIVAR", user.id);
  revalidatePath("/cadastros/servicos");
}

export async function deleteServico(_prevState: { error?: string } | undefined, formData: FormData) {
  const user = await requireAdmin();
  const servicoId = formData.get("servicoId") as string;

  const servico = await prisma.servico.findUnique({
    where: { id: servicoId },
    include: { _count: { select: { chamados: true } } },
  });
  if (!servico) return { error: "Serviço não encontrado." };
  if (servico._count.chamados > 0) {
    return {
      error: "Não é possível excluir: existem chamados vinculados a este serviço. Inative-o em vez de excluir.",
    };
  }

  await prisma.servico.delete({ where: { id: servicoId } });
  await logAudit("Servico", servicoId, "DELETE", user.id, { nome: servico.nome });
  revalidatePath("/cadastros/servicos");
  return {};
}

const updateServicoSchema = z.object({
  nome: z.string().min(1),
  categoria: z.enum(CATEGORIAS_SERVICO),
  textoOrientacao: z.string().optional(),
  slaPresetId: z.string().min(1),
});

export async function updateServico(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const servicoId = formData.get("servicoId") as string;
  const parsed = updateServicoSchema.safeParse({
    nome: formData.get("nome"),
    categoria: formData.get("categoria"),
    textoOrientacao: formData.get("textoOrientacao") || undefined,
    slaPresetId: formData.get("slaPresetId"),
  });
  if (!parsed.success) return { error: "Preencha os campos obrigatórios corretamente." };

  await prisma.servico.update({ where: { id: servicoId }, data: parsed.data });
  await logAudit("Servico", servicoId, "ATUALIZAR", user.id, parsed.data);

  revalidatePath("/cadastros/servicos");
  redirect("/cadastros/servicos");
}

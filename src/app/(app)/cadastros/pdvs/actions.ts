"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { parseLocalDate } from "@/lib/business-calendar";

const pdvSchema = z.object({
  nome: z.string().min(1),
  codigo: z.string().min(1).toUpperCase(),
});

const diaHorarioSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  abre: z.boolean(),
  horarioInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horarioFim: z.string().regex(/^\d{2}:\d{2}$/),
});

/** Lê os 7 dias da semana (abre_N/inicio_N/fim_N) e a regra de distribuição de um FormData. */
function parseCalendarioFormData(formData: FormData) {
  const regraDistribuicao = formData.get("regraDistribuicao") as string;
  if (!["FILA_ABERTA", "ROUND_ROBIN"].includes(regraDistribuicao)) {
    return { error: "Selecione uma regra de distribuição válida." } as const;
  }

  const horarios = [0, 1, 2, 3, 4, 5, 6].map((diaSemana) =>
    diaHorarioSchema.safeParse({
      diaSemana,
      abre: formData.get(`abre_${diaSemana}`) === "on",
      horarioInicio: formData.get(`inicio_${diaSemana}`),
      horarioFim: formData.get(`fim_${diaSemana}`),
    })
  );
  if (horarios.some((h) => !h.success)) {
    return { error: "Verifique os horários de cada dia." } as const;
  }

  return { regraDistribuicao, horarios: horarios.map((h) => h.data!) } as const;
}

export async function createPdv(_prevState: { error?: string } | undefined, formData: FormData) {
  const user = await requireAdmin();
  const parsed = pdvSchema.safeParse({
    nome: formData.get("nome"),
    codigo: formData.get("codigo"),
  });
  if (!parsed.success) return { error: "Preencha todos os campos." };

  const calendario = parseCalendarioFormData(formData);
  if ("error" in calendario) return { error: calendario.error };

  const exists = await prisma.pdv.findUnique({ where: { codigo: parsed.data.codigo } });
  if (exists) return { error: "Já existe um PDV com esse código." };

  const pdv = await prisma.pdv.create({
    data: { ...parsed.data, regraDistribuicao: calendario.regraDistribuicao },
  });

  await prisma.pdvHorario.createMany({
    data: calendario.horarios.map((h) => ({ pdvId: pdv.id, ...h })),
  });

  await logAudit("Pdv", pdv.id, "CREATE", user.id, {
    ...parsed.data,
    regraDistribuicao: calendario.regraDistribuicao,
    horarios: calendario.horarios,
  });
  revalidatePath("/cadastros/pdvs");
  return {};
}

export async function togglePdvAtivo(pdvId: string, ativo: boolean) {
  const user = await requireAdmin();
  await prisma.pdv.update({ where: { id: pdvId }, data: { ativo } });
  await logAudit("Pdv", pdvId, ativo ? "ATIVAR" : "INATIVAR", user.id);
  revalidatePath("/cadastros/pdvs");
}

export async function updatePdvCalendario(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const pdvId = formData.get("pdvId") as string;

  const calendario = parseCalendarioFormData(formData);
  if ("error" in calendario) return { error: calendario.error };

  await prisma.$transaction([
    prisma.pdv.update({ where: { id: pdvId }, data: { regraDistribuicao: calendario.regraDistribuicao } }),
    ...calendario.horarios.map((h) =>
      prisma.pdvHorario.upsert({
        where: { pdvId_diaSemana: { pdvId, diaSemana: h.diaSemana } },
        update: { abre: h.abre, horarioInicio: h.horarioInicio, horarioFim: h.horarioFim },
        create: { pdvId, ...h },
      })
    ),
  ]);

  await logAudit("Pdv", pdvId, "ATUALIZAR_CALENDARIO", user.id, {
    regraDistribuicao: calendario.regraDistribuicao,
    horarios: calendario.horarios,
  });
  revalidatePath(`/cadastros/pdvs/${pdvId}`);
  return {};
}

const editPdvSchema = z.object({
  nome: z.string().min(1),
  codigo: z.string().min(1).toUpperCase(),
});

export async function updatePdvInfo(_prevState: { error?: string } | undefined, formData: FormData) {
  const user = await requireAdmin();
  const pdvId = formData.get("pdvId") as string;
  const parsed = editPdvSchema.safeParse({
    nome: formData.get("nome"),
    codigo: formData.get("codigo"),
  });
  if (!parsed.success) return { error: "Preencha todos os campos." };

  const exists = await prisma.pdv.findFirst({
    where: { codigo: parsed.data.codigo, NOT: { id: pdvId } },
  });
  if (exists) return { error: "Já existe outro PDV com esse código." };

  await prisma.pdv.update({ where: { id: pdvId }, data: parsed.data });
  await logAudit("Pdv", pdvId, "ATUALIZAR", user.id, parsed.data);
  revalidatePath("/cadastros/pdvs");
  revalidatePath(`/cadastros/pdvs/${pdvId}`);
  return {};
}

export async function deletePdv(_prevState: { error?: string } | undefined, formData: FormData) {
  const user = await requireAdmin();
  const pdvId = formData.get("pdvId") as string;

  const pdv = await prisma.pdv.findUnique({
    where: { id: pdvId },
    include: {
      _count: { select: { chamados: true } },
      pedidos: { include: { _count: { select: { chamados: true } } } },
    },
  });
  if (!pdv) return { error: "PDV não encontrado." };
  const pedidosComChamado = pdv.pedidos.filter((p) => p._count.chamados > 0).length;
  if (pedidosComChamado > 0 || pdv._count.chamados > 0) {
    return {
      error: "Não é possível excluir: existem pedidos/chamados vinculados a este PDV. Inative-o em vez de excluir.",
    };
  }

  // Pedidos sem nenhum chamado são só o registro do pedido em si (nada real
  // depende deles) — excluir o PDV limpa esses órfãos junto.
  await prisma.$transaction([
    prisma.pedido.deleteMany({ where: { pdvId } }),
    prisma.pdv.delete({ where: { id: pdvId } }),
  ]);
  await logAudit("Pdv", pdvId, "DELETE", user.id, { codigo: pdv.codigo, nome: pdv.nome });
  revalidatePath("/cadastros/pdvs");
  return {};
}

const feriadoSchema = z.object({
  data: z.string().min(1),
  descricao: z.string().min(1),
  pdvId: z.string().min(1),
});

export async function createFeriado(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireAdmin();
  const parsed = feriadoSchema.safeParse({
    data: formData.get("data"),
    descricao: formData.get("descricao"),
    pdvId: formData.get("pdvId"),
  });
  if (!parsed.success) return { error: "Informe a data e a descrição do feriado." };

  const feriado = await prisma.feriado.create({
    data: {
      pdvId: parsed.data.pdvId,
      descricao: parsed.data.descricao,
      data: parseLocalDate(parsed.data.data),
    },
  });
  await logAudit("Feriado", feriado.id, "CREATE", user.id, parsed.data);
  revalidatePath(`/cadastros/pdvs/${parsed.data.pdvId}`);
  return {};
}

export async function deleteFeriado(feriadoId: string, pdvId: string) {
  const user = await requireAdmin();
  await prisma.feriado.delete({ where: { id: feriadoId } });
  await logAudit("Feriado", feriadoId, "DELETE", user.id);
  revalidatePath(`/cadastros/pdvs/${pdvId}`);
}

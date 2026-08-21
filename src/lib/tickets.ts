import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { STATUS_FINAIS } from "@/lib/constants";
import { getVisiblePdvIds, ticketScopeFilterForRequester, type SessionUser } from "@/lib/permissions";
import { duracaoSlaEmHoras } from "@/lib/sla-format";
import {
  addBusinessMinutes,
  businessMinutesBetween,
  parseLocalDate,
  type PdvCalendar,
} from "@/lib/business-calendar";

/** Valor sentinela usado no filtro de Responsável pra representar "sem responsável". */
export const SEM_RESPONSAVEL_VALUE = "SEM_RESPONSAVEL";

/** Separa um parâmetro de URL em valores múltiplos (ex.: "ABERTO,EM_ANDAMENTO"). */
function parseMulti(valor: string | undefined): string[] | undefined {
  const valores = valor?.split(",").filter(Boolean);
  return valores && valores.length > 0 ? valores : undefined;
}

/**
 * Where de escopo (perfil/PDV/equipe) + filtros de URL, compartilhado entre
 * a listagem de chamados e os relatórios. Os filtros de seleção (status,
 * prioridade, PDV, serviço, solicitante, operador) aceitam múltiplos valores
 * separados por vírgula.
 */
export function buildChamadoWhere(
  user: SessionUser,
  sp: Record<string, string | undefined>
): Prisma.ChamadoWhereInput {
  const where: Prisma.ChamadoWhereInput = {};

  const visiblePdvIds = getVisiblePdvIds(user);
  if (visiblePdvIds !== null) where.pdvId = { in: visiblePdvIds };

  const requesterScope = ticketScopeFilterForRequester(user);
  if (requesterScope) where.abertoPorId = requesterScope;

  const statusValues = parseMulti(sp.status);
  if (statusValues?.length) where.status = { in: statusValues };

  const slaValues = parseMulti(sp.sla);
  if (slaValues?.length) where.slaPresetId = { in: slaValues };

  const pdvValues = parseMulti(sp.pdvId);
  if (pdvValues?.length) {
    where.pdvId = {
      in: visiblePdvIds !== null ? pdvValues.filter((id) => visiblePdvIds.includes(id)) : pdvValues,
    };
  }

  const servicoValues = parseMulti(sp.servicoId);
  if (servicoValues?.length) where.servicoId = { in: servicoValues };

  if (!requesterScope) {
    const solicitanteValues = parseMulti(sp.solicitanteId);
    if (solicitanteValues?.length) where.abertoPorId = { in: solicitanteValues };
  }

  const operadorValues = parseMulti(sp.operadorId);
  if (operadorValues?.length) {
    const semResponsavel = operadorValues.includes(SEM_RESPONSAVEL_VALUE);
    const ids = operadorValues.filter((v) => v !== SEM_RESPONSAVEL_VALUE);
    if (semResponsavel && ids.length) {
      where.OR = [{ responsavelId: { in: ids } }, { responsavelId: null }];
    } else if (semResponsavel) {
      where.responsavelId = null;
    } else {
      where.responsavelId = { in: ids };
    }
  }

  if (sp.numero) {
    const numeroBuscado = parseInt(sp.numero.replace(/\D/g, ""), 10);
    if (!Number.isNaN(numeroBuscado)) where.numero = numeroBuscado;
  }
  if (sp.pedido || sp.codigoRevendedor) {
    where.pedido = {
      is: {
        ...(sp.pedido ? { numero: { contains: sp.pedido } } : {}),
        ...(sp.codigoRevendedor ? { codigoRevendedor: { contains: sp.codigoRevendedor } } : {}),
      },
    };
  }
  if (sp.de || sp.ate) {
    where.createdAt = {
      ...(sp.de ? { gte: parseLocalDate(sp.de) } : {}),
      ...(sp.ate ? { lte: new Date(`${sp.ate}T23:59:59`) } : {}),
    };
  }

  // Atalhos de acesso rápido do dashboard de Monitoramento
  if (sp.pendente === "1") {
    where.status = { notIn: STATUS_FINAIS };
  }
  if (sp.slaVencido === "1") {
    where.status = { notIn: STATUS_FINAIS };
    where.slaVencimentoEm = { lt: new Date() };
  }
  if (sp.semResponsavel === "1") {
    where.status = { notIn: STATUS_FINAIS };
    where.responsavelId = null;
  }

  return where;
}

const CHAMADO_SORT_FIELDS = [
  "numero",
  "servico",
  "sla",
  "status",
  "createdAt",
  "finalizadoEm",
] as const;
export type ChamadoSortField = (typeof CHAMADO_SORT_FIELDS)[number];

/** orderBy dinâmico a partir de `sort`/`dir` na URL — default createdAt desc. */
export function buildChamadoOrderBy(
  sp: Record<string, string | undefined>
): Prisma.ChamadoOrderByWithRelationInput {
  const campo = (CHAMADO_SORT_FIELDS as readonly string[]).includes(sp.sort ?? "")
    ? (sp.sort as ChamadoSortField)
    : "createdAt";
  const direcao = sp.dir === "asc" ? "asc" : "desc";
  if (campo === "servico") return { servico: { nome: direcao } };
  if (campo === "sla") return { slaPreset: { nome: direcao } };
  return { [campo]: direcao };
}

/** Formata o número sequencial do chamado, zero-padded a 4 dígitos (#0001, #0002, ...). */
export function formatarNumeroChamado(numero: number) {
  return `#${String(numero).padStart(4, "0")}`;
}

/** Monta o calendário útil (horários + feriados dos próximos 90 dias) de um PDV. */
async function buildPdvCalendar(pdvId: string, from: Date): Promise<PdvCalendar | null> {
  const pdv = await prisma.pdv.findUnique({ where: { id: pdvId } });
  if (!pdv) return null;

  const horarios = await prisma.pdvHorario.findMany({ where: { pdvId } });

  const limiteFeriados = new Date(from);
  limiteFeriados.setDate(limiteFeriados.getDate() + 90);
  const feriados = await prisma.feriado.findMany({
    where: { pdvId, data: { gte: from, lte: limiteFeriados } },
  });

  return { horarios, feriados: feriados.map((f) => f.data) };
}

export async function computeSlaVencimento(
  servicoId: string,
  pdvId: string,
  from: Date = new Date()
) {
  const servico = await prisma.servico.findUnique({
    where: { id: servicoId },
    include: { slaPreset: true },
  });
  if (!servico) return null;
  const prazoHoras = duracaoSlaEmHoras(servico.slaPreset.duracao, servico.slaPreset.unidade);

  const cal = await buildPdvCalendar(pdvId, from);
  if (!cal) return new Date(from.getTime() + prazoHoras * 60 * 60 * 1000);

  return addBusinessMinutes(from, prazoHoras * 60, cal);
}

export type AlertaVencimento = "risco" | "vencido" | null;

/**
 * Classifica o alerta visual de vencimento do SLA pra uma linha da listagem:
 * "vencido" depois do prazo, "risco" quando faltam `alertaHoras` horas úteis
 * ou menos, `null` fora dessas janelas ou pra chamados finalizados/cancelados
 * (STATUS_FINAIS) — a linha volta à cor padrão nesses casos.
 */
export function classificarAlertaVencimento(
  chamado: { status: string; slaVencimentoEm: Date | null },
  alertaHoras: number,
  pdvCalendar: PdvCalendar,
  now: Date = new Date()
): AlertaVencimento {
  if (!chamado.slaVencimentoEm || STATUS_FINAIS.includes(chamado.status)) return null;
  if (now > chamado.slaVencimentoEm) return "vencido";
  const restanteMinutos = businessMinutesBetween(now, chamado.slaVencimentoEm, pdvCalendar);
  if (restanteMinutos <= alertaHoras * 60) return "risco";
  return null;
}

/** Tempo total (corrido) e útil, em horas, entre a abertura e a finalização do chamado. */
export function tempoConclusaoChamado(
  chamado: { createdAt: Date; finalizadoEm: Date | null },
  pdvCalendar: PdvCalendar
): { totalHoras: number; horasUteis: number } | null {
  if (!chamado.finalizadoEm) return null;
  const totalHoras = (chamado.finalizadoEm.getTime() - chamado.createdAt.getTime()) / (1000 * 60 * 60);
  const horasUteis = businessMinutesBetween(chamado.createdAt, chamado.finalizadoEm, pdvCalendar) / 60;
  return { totalHoras, horasUteis };
}

/**
 * Escolhe o próximo responsável em round-robin entre operadores/gestores ativos
 * do PDV, e avança o ponteiro de rotação. Retorna null se o PDV estiver em fila
 * aberta ou sem ninguém vinculado (mantém o comportamento manual de "assumir").
 */
export async function resolveResponsavelAutomatico(pdvId: string): Promise<string | null> {
  const pdv = await prisma.pdv.findUnique({ where: { id: pdvId } });
  if (!pdv || pdv.regraDistribuicao !== "ROUND_ROBIN") return null;

  const vinculos = await prisma.usuarioPdv.findMany({
    where: { pdvId, usuario: { ativo: true, perfil: { in: ["OPERADOR_LOGISTICA", "GESTOR_VD"] } } },
    include: { usuario: true },
    orderBy: { usuarioId: "asc" },
  });
  if (vinculos.length === 0) return null;

  const idxAtual = vinculos.findIndex((v) => v.usuarioId === pdv.proximoOperadorId);
  const proximo = vinculos[(idxAtual + 1) % vinculos.length];
  const depoisDoProximo = vinculos[(idxAtual + 2) % vinculos.length];

  await prisma.pdv.update({
    where: { id: pdvId },
    data: { proximoOperadorId: depoisDoProximo.usuarioId },
  });

  return proximo.usuarioId;
}

export async function findChamadoDuplicado(pedidoId: string, servicoId: string) {
  return prisma.chamado.findFirst({
    where: {
      pedidoId,
      servicoId,
      status: { notIn: STATUS_FINAIS },
    },
    select: { id: true, status: true, createdAt: true },
  });
}

/** PDV do pedido, e flag indicando se está sem operador ativo no momento. */
export async function resolveRoteamento(pedidoId: string) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { pdv: true },
  });
  if (!pedido) throw new Error("Pedido não encontrado");

  const pdv = pedido.pdv;
  const operadorAtivo = await prisma.usuarioPdv.findFirst({
    where: {
      pdvId: pdv.id,
      usuario: {
        ativo: true,
        perfil: { in: ["OPERADOR_LOGISTICA", "GESTOR_VD"] },
      },
    },
  });

  return { pdv, semOperadorNoMomento: !operadorAtivo };
}

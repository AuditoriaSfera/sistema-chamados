import { STATUS_FINAIS } from "@/lib/constants";
import { businessMinutesBetween, type PdvCalendar } from "@/lib/business-calendar";

/** Calendário útil (horários + feriados) de cada PDV, montado uma vez e reaproveitado nos cálculos. */
export type CalendarioPorPdv = Map<string, PdvCalendar>;

const CALENDARIO_VAZIO: PdvCalendar = { horarios: [], feriados: [] };

/** Duração em horas corridas e em horas úteis (calendário do PDV) entre dois instantes. */
export type Duracao = { totalHoras: number; utilHoras: number };

export type ChamadoReportRow = {
  id: string;
  numero: number;
  status: string;
  slaPreset: { id: string; nome: string; cor: string; critica: boolean };
  subMotivoFinalizacao: string | null;
  createdAt: Date;
  finalizadoEm: Date | null;
  slaVencimentoEm: Date | null;
  motivoReabertura: string | null;
  pdv: { id: string; codigo: string; nome: string };
  servico: { nome: string };
  pedido: { numero: string; nomeCliente: string };
  abertoPor: { id: string; nome: string };
  responsavel: { id: string; nome: string } | null;
  mensagens: { autorId: string; createdAt: Date }[];
};

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function hoursBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

function duracaoEntre(a: Date, b: Date, cal: PdvCalendar): Duracao {
  return {
    totalHoras: hoursBetween(a, b),
    utilHoras: businessMinutesBetween(a, b, cal) / 60,
  };
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Média de horas corridas e úteis, aplicada aos dois lados de uma lista de Duracao. */
function averageDuracao(valores: Duracao[]): Duracao | null {
  if (valores.length === 0) return null;
  return {
    totalHoras: average(valores.map((v) => v.totalHoras))!,
    utilHoras: average(valores.map((v) => v.utilHoras))!,
  };
}

export function tempoResolucao(c: ChamadoReportRow, calendarios: CalendarioPorPdv): Duracao | null {
  // Reabertura não limpa finalizadoEm (histórico), então só conta como resolvido
  // o chamado que está FINALIZADO agora — senão um reaberto contaria como resolvido.
  if (!c.finalizadoEm || c.status !== "FINALIZADO") return null;
  return duracaoEntre(c.createdAt, c.finalizadoEm, calendarios.get(c.pdv.id) ?? CALENDARIO_VAZIO);
}

function tempoPrimeiraResposta(c: ChamadoReportRow, calendarios: CalendarioPorPdv): Duracao | null {
  const primeira = c.mensagens
    .filter((m) => m.autorId !== c.abertoPor.id)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  if (!primeira) return null;
  return duracaoEntre(
    c.createdAt,
    primeira.createdAt,
    calendarios.get(c.pdv.id) ?? CALENDARIO_VAZIO
  );
}

export function slaStats(chamados: ChamadoReportRow[], now: Date = new Date()) {
  let cumpridos = 0;
  let vencidos = 0;
  let emRisco = 0;
  let semSla = 0;

  for (const c of chamados) {
    if (!c.slaVencimentoEm) {
      semSla++;
      continue;
    }
    const finalizadoOuCancelado = STATUS_FINAIS.includes(c.status);
    if (finalizadoOuCancelado) {
      if (c.status === "CANCELADO") continue;
      if (c.finalizadoEm && c.finalizadoEm <= c.slaVencimentoEm) cumpridos++;
      else vencidos++;
    } else {
      if (now > c.slaVencimentoEm) {
        vencidos++;
      } else {
        const prazoTotalMs = c.slaVencimentoEm.getTime() - c.createdAt.getTime();
        const restanteMs = c.slaVencimentoEm.getTime() - now.getTime();
        if (prazoTotalMs > 0 && restanteMs <= prazoTotalMs * 0.2) emRisco++;
      }
    }
  }

  const consideraveis = chamados.length - semSla;
  const pct = (n: number) => (consideraveis > 0 ? Math.round((n / consideraveis) * 100) : 0);

  return {
    total: chamados.length,
    cumpridos,
    vencidos,
    emRisco,
    cumpridoPct: pct(cumpridos),
    vencidoPct: pct(vencidos),
    emRiscoPct: pct(emRisco),
  };
}

export function porPdv(chamados: ChamadoReportRow[], calendarios: CalendarioPorPdv) {
  const grupos = new Map<string, ChamadoReportRow[]>();
  for (const c of chamados) {
    const arr = grupos.get(c.pdv.codigo) ?? [];
    arr.push(c);
    grupos.set(c.pdv.codigo, arr);
  }
  return Array.from(grupos.entries())
    .map(([pdvCodigo, lista]) => {
      const sla = slaStats(lista);
      const tempos = lista
        .map((c) => tempoResolucao(c, calendarios))
        .filter((v): v is Duracao => v !== null);
      return {
        pdvCodigo,
        total: lista.length,
        cumpridoPct: sla.cumpridoPct,
        vencidoPct: sla.vencidoPct,
        tempoMedioResolucao: averageDuracao(tempos),
      };
    })
    .sort((a, b) => b.total - a.total);
}

function contarPor<T>(chamados: ChamadoReportRow[], key: (c: ChamadoReportRow) => T) {
  const contagem = new Map<T, number>();
  for (const c of chamados) {
    const k = key(c);
    contagem.set(k, (contagem.get(k) ?? 0) + 1);
  }
  return contagem;
}

/** Tipos de serviço mais requisitados, com a contagem aberta por PDV (colunas) e o total no final. */
export function servicosMaisRequisitados(chamados: ChamadoReportRow[]) {
  const pdvCodigos = Array.from(new Set(chamados.map((c) => c.pdv.codigo))).sort();

  const porServico = new Map<string, Map<string, number>>();
  for (const c of chamados) {
    const porPdv = porServico.get(c.servico.nome) ?? new Map<string, number>();
    porPdv.set(c.pdv.codigo, (porPdv.get(c.pdv.codigo) ?? 0) + 1);
    porServico.set(c.servico.nome, porPdv);
  }

  const rows = Array.from(porServico.entries())
    .map(([servico, porPdv]) => ({
      servico,
      porPdv: Object.fromEntries(porPdv) as Record<string, number>,
      total: Array.from(porPdv.values()).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total);

  return { pdvCodigos, rows };
}

export function produtividadePorOperador(chamados: ChamadoReportRow[], calendarios: CalendarioPorPdv) {
  const grupos = new Map<string, ChamadoReportRow[]>();
  for (const c of chamados) {
    if (!c.responsavel) continue;
    const arr = grupos.get(c.responsavel.nome) ?? [];
    arr.push(c);
    grupos.set(c.responsavel.nome, arr);
  }
  return Array.from(grupos.entries())
    .map(([operador, lista]) => {
      const finalizados = lista.filter((c) => c.status === "FINALIZADO").length;
      const temposResposta = lista
        .map((c) => tempoPrimeiraResposta(c, calendarios))
        .filter((v): v is Duracao => v !== null);
      const temposResolucao = lista
        .map((c) => tempoResolucao(c, calendarios))
        .filter((v): v is Duracao => v !== null);
      return {
        operador,
        totalAtribuidos: lista.length,
        finalizados,
        tempoMedioPrimeiraResposta: averageDuracao(temposResposta),
        tempoMedioResolucao: averageDuracao(temposResolucao),
      };
    })
    .sort((a, b) => b.totalAtribuidos - a.totalAtribuidos);
}

export function produtividadePorPdv(chamados: ChamadoReportRow[], calendarios: CalendarioPorPdv) {
  const grupos = new Map<string, ChamadoReportRow[]>();
  for (const c of chamados) {
    const arr = grupos.get(c.pdv.codigo) ?? [];
    arr.push(c);
    grupos.set(c.pdv.codigo, arr);
  }
  return Array.from(grupos.entries())
    .map(([pdvCodigo, lista]) => {
      const finalizados = lista.filter((c) => c.status === "FINALIZADO").length;
      const temposResposta = lista
        .map((c) => tempoPrimeiraResposta(c, calendarios))
        .filter((v): v is Duracao => v !== null);
      const temposResolucao = lista
        .map((c) => tempoResolucao(c, calendarios))
        .filter((v): v is Duracao => v !== null);
      return {
        pdvCodigo,
        totalAtribuidos: lista.length,
        finalizados,
        tempoMedioPrimeiraResposta: averageDuracao(temposResposta),
        tempoMedioResolucao: averageDuracao(temposResolucao),
      };
    })
    .sort((a, b) => b.totalAtribuidos - a.totalAtribuidos);
}

export function pdvsComMaisChamados(
  chamados: ChamadoReportRow[],
  calendarios: CalendarioPorPdv,
  now: Date = new Date()
) {
  const grupos = new Map<string, ChamadoReportRow[]>();
  for (const c of chamados) {
    const key = `${c.pdv.id}|${c.pdv.codigo}|${c.pdv.nome}`;
    const arr = grupos.get(key) ?? [];
    arr.push(c);
    grupos.set(key, arr);
  }
  return Array.from(grupos.entries())
    .map(([key, lista]) => {
      const [pdvId, pdvCodigo, pdvNome] = key.split("|");
      const cal = calendarios.get(pdvId) ?? CALENDARIO_VAZIO;
      const temposAberto = lista.map((c) =>
        duracaoEntre(
          c.createdAt,
          c.status === "FINALIZADO" && c.finalizadoEm ? c.finalizadoEm : now,
          cal
        )
      );
      return {
        pdvCodigo,
        pdvNome,
        total: lista.length,
        tempoMedioAberto: averageDuracao(temposAberto),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function revendedoresComMaisChamados(chamados: ChamadoReportRow[], top = 15) {
  const contagem = contarPor(chamados, (c) => c.pedido.nomeCliente);
  return Array.from(contagem.entries())
    .map(([cliente, total]) => ({ cliente, total, reincidente: total > 1 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, top);
}

export function rankingChamadosPorSolicitante(chamados: ChamadoReportRow[], top = 15) {
  const contagem = contarPor(chamados, (c) => c.abertoPor.nome);
  return Array.from(contagem.entries())
    .map(([solicitante, total]) => ({ solicitante, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, top);
}

export function rankingReaberturaPorSolicitante(chamados: ChamadoReportRow[], top = 15) {
  const grupos = new Map<string, ChamadoReportRow[]>();
  for (const c of chamados) {
    const arr = grupos.get(c.abertoPor.nome) ?? [];
    arr.push(c);
    grupos.set(c.abertoPor.nome, arr);
  }
  return Array.from(grupos.entries())
    .map(([solicitante, lista]) => {
      const reabertos = lista.filter((c) => c.motivoReabertura).length;
      return {
        solicitante,
        total: lista.length,
        reabertos,
        taxaPct: lista.length > 0 ? Math.round((reabertos / lista.length) * 100) : 0,
      };
    })
    .filter((r) => r.reabertos > 0)
    .sort((a, b) => b.reabertos - a.reabertos)
    .slice(0, top);
}

export function volumePorDiaSemana(chamados: ChamadoReportRow[]) {
  const contagem = new Array(7).fill(0);
  for (const c of chamados) contagem[c.createdAt.getDay()]++;
  return DIAS_SEMANA.map((dia, i) => ({ dia, total: contagem[i] }));
}

export function taxaReaberturaPorPdv(chamados: ChamadoReportRow[]) {
  const grupos = new Map<string, ChamadoReportRow[]>();
  for (const c of chamados) {
    const arr = grupos.get(c.pdv.codigo) ?? [];
    arr.push(c);
    grupos.set(c.pdv.codigo, arr);
  }
  return Array.from(grupos.entries())
    .map(([pdvCodigo, lista]) => {
      const reabertos = lista.filter((c) => c.motivoReabertura).length;
      return {
        pdvCodigo,
        total: lista.length,
        reabertos,
        taxaPct: lista.length > 0 ? Math.round((reabertos / lista.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function taxaReaberturaGeral(chamados: ChamadoReportRow[]) {
  const reabertos = chamados.filter((c) => c.motivoReabertura).length;
  return chamados.length > 0 ? Math.round((reabertos / chamados.length) * 100) : 0;
}

export function tempoMedioResolucaoGeral(chamados: ChamadoReportRow[], calendarios: CalendarioPorPdv) {
  const tempos = chamados
    .map((c) => tempoResolucao(c, calendarios))
    .filter((v): v is Duracao => v !== null);
  return averageDuracao(tempos);
}

export type SlaClassificacao = "ok" | "risco" | "vencido";

/** Mesmo critério de "em risco" (≤20% do prazo restante) usado em slaStats. */
export function classificarSla(
  c: Pick<ChamadoReportRow, "status" | "createdAt" | "slaVencimentoEm">,
  now: Date = new Date()
): SlaClassificacao | null {
  if (!c.slaVencimentoEm || STATUS_FINAIS.includes(c.status)) return null;
  if (now > c.slaVencimentoEm) return "vencido";
  const prazoTotalMs = c.slaVencimentoEm.getTime() - c.createdAt.getTime();
  const restanteMs = c.slaVencimentoEm.getTime() - now.getTime();
  if (prazoTotalMs > 0 && restanteMs <= prazoTotalMs * 0.2) return "risco";
  return "ok";
}

export type SlaCumprimento = "cumprido" | "vencido" | "em_andamento" | "sem_sla";

/** Classificação de cumprimento de SLA por chamado, no mesmo critério usado em slaStats. */
export function classificarCumprimentoSla(
  c: Pick<ChamadoReportRow, "status" | "finalizadoEm" | "slaVencimentoEm">,
  now: Date = new Date()
): SlaCumprimento {
  if (!c.slaVencimentoEm) return "sem_sla";
  if (STATUS_FINAIS.includes(c.status)) {
    if (c.status === "CANCELADO") return "sem_sla";
    if (c.finalizadoEm && c.finalizadoEm <= c.slaVencimentoEm) return "cumprido";
    return "vencido";
  }
  return now > c.slaVencimentoEm ? "vencido" : "em_andamento";
}

/** Carga de trabalho atual (chamados ainda não finalizados/cancelados) por operador. */
export function cargaAtivaPorOperador(chamados: ChamadoReportRow[]) {
  const ativos = chamados.filter((c) => !STATUS_FINAIS.includes(c.status));
  const grupos = new Map<string, ChamadoReportRow[]>();
  for (const c of ativos) {
    if (!c.responsavel) continue;
    const arr = grupos.get(c.responsavel.nome) ?? [];
    arr.push(c);
    grupos.set(c.responsavel.nome, arr);
  }
  return Array.from(grupos.entries())
    .map(([operador, lista]) => ({
      operador,
      ativos: lista.length,
      vencidos: lista.filter((c) => classificarSla(c) === "vencido").length,
    }))
    .sort((a, b) => b.ativos - a.ativos);
}

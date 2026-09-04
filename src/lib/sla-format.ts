export const UNIDADES_SLA = ["HORAS", "DIAS"] as const;
export type UnidadeSla = (typeof UNIDADES_SLA)[number];

export const UNIDADE_SLA_LABELS: Record<UnidadeSla, string> = {
  HORAS: "Horas",
  DIAS: "Dias",
};

/** Ex.: (24, "HORAS") -> "24 horas" · (1, "DIAS") -> "1 dia" */
export function formatarDuracaoSla(duracao: number, unidade: string): string {
  if (unidade === "DIAS") return duracao === 1 ? "1 dia" : `${duracao} dias`;
  return duracao === 1 ? "1 hora" : `${duracao} horas`;
}

/** Converte a duração do preset (horas ou dias) pro equivalente em horas, usado no cálculo de SLA. */
export function duracaoSlaEmHoras(duracao: number, unidade: string): number {
  return unidade === "DIAS" ? duracao * 24 : duracao;
}

/** Formata uma duração em horas pra exibição — "42min" abaixo de 1h, "6h 42min" acima
 * (sem o "42min" quando é hora cheia), e vira dias quando passa de 48h. */
export function fmtHoras(h: number | null): string {
  if (h === null) return "—";
  if (h >= 48) return `${(h / 24).toFixed(1)}d`;
  const totalMin = Math.round(h * 60);
  if (totalMin < 60) return `${totalMin}min`;
  const horas = Math.floor(totalMin / 60);
  const minutos = totalMin % 60;
  return minutos === 0 ? `${horas}h` : `${horas}h ${minutos}min`;
}

/** "vence em 3h 12min" quando o prazo ainda não passou, "vencido há 18min" quando já passou. */
export function formatarPrazoRelativo(alvo: Date, agora: Date = new Date()): string {
  const diffHoras = (alvo.getTime() - agora.getTime()) / (1000 * 60 * 60);
  return diffHoras >= 0 ? `vence em ${fmtHoras(diffHoras)}` : `vencido há ${fmtHoras(-diffHoras)}`;
}

/** Resultado do SLA de um chamado já finalizado: dentro do prazo (com folga) ou fora (com atraso). */
export function formatarResultadoSla(finalizadoEm: Date, slaVencimentoEm: Date): string {
  const diffHoras = (slaVencimentoEm.getTime() - finalizadoEm.getTime()) / (1000 * 60 * 60);
  return diffHoras >= 0
    ? `finalizado ${fmtHoras(diffHoras)} antes do prazo`
    : `finalizado ${fmtHoras(-diffHoras)} após o prazo`;
}

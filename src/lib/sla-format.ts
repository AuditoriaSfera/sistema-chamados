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

/** Formata uma duração em horas decimais pra exibição — vira dias quando passa de 48h. */
export function fmtHoras(h: number | null): string {
  if (h === null) return "—";
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

/** Formata uma duração em horas decimais, usando minutos quando for menos de 1h (mais legível que "0.3h"). */
function fmtHorasOuMinutos(h: number): string {
  if (h < 1) {
    const minutos = Math.round(h * 60);
    if (minutos < 60) return `${minutos}min`;
  }
  return fmtHoras(h);
}

/** "vence em 3.2h" quando o prazo ainda não passou, "vencido há 18min" quando já passou. */
export function formatarPrazoRelativo(alvo: Date, agora: Date = new Date()): string {
  const diffHoras = (alvo.getTime() - agora.getTime()) / (1000 * 60 * 60);
  return diffHoras >= 0
    ? `vence em ${fmtHorasOuMinutos(diffHoras)}`
    : `vencido há ${fmtHorasOuMinutos(-diffHoras)}`;
}

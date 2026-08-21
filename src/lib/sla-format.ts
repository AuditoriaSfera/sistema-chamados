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

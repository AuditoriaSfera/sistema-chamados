/**
 * Paleta de cores fixa usada pelo cadastro dinâmico de SLA.
 * A cor é sempre atribuída automaticamente (round-robin pela quantidade de
 * registros já existentes) — o admin não escolhe cor na hora de cadastrar.
 */
export const COLOR_PALETTE = [
  "red",
  "blue",
  "amber",
  "emerald",
  "violet",
  "orange",
  "slate",
  "pink",
  "cyan",
  "lime",
] as const;
export type ColorKey = (typeof COLOR_PALETTE)[number];

export function proximaCor(quantidadeExistente: number): ColorKey {
  return COLOR_PALETTE[quantidadeExistente % COLOR_PALETTE.length];
}

export const COLOR_BADGE_CLASSES: Record<ColorKey, string> = {
  red: "bg-red-500/15 text-red-600 dark:text-red-400",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  slate: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  pink: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  cyan: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  lime: "bg-lime-500/15 text-lime-600 dark:text-lime-400",
};

export const COLOR_DOT_CLASSES: Record<ColorKey, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  orange: "bg-orange-500",
  slate: "bg-slate-500",
  pink: "bg-pink-500",
  cyan: "bg-cyan-500",
  lime: "bg-lime-500",
};

/** Borda esquerda de destaque (cards de relatório, seções) na mesma paleta dos badges/dots. */
export const COLOR_BORDER_CLASSES: Record<ColorKey, string> = {
  red: "border-l-red-500",
  blue: "border-l-blue-500",
  amber: "border-l-amber-500",
  emerald: "border-l-emerald-500",
  violet: "border-l-violet-500",
  orange: "border-l-orange-500",
  slate: "border-l-slate-500",
  pink: "border-l-pink-500",
  cyan: "border-l-cyan-500",
  lime: "border-l-lime-500",
};

export function corBadgeClasses(cor: string): string {
  return COLOR_BADGE_CLASSES[cor as ColorKey] ?? COLOR_BADGE_CLASSES.slate;
}

export function corDotClasses(cor: string): string {
  return COLOR_DOT_CLASSES[cor as ColorKey] ?? COLOR_DOT_CLASSES.slate;
}

export function corBorderClasses(cor: string): string {
  return COLOR_BORDER_CLASSES[cor as ColorKey] ?? COLOR_BORDER_CLASSES.slate;
}

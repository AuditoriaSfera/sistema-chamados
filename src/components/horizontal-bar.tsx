import { cn } from "@/lib/utils";
import { COLOR_DOT_CLASSES, type ColorKey } from "@/lib/color-palette";

/**
 * Barra horizontal simples (só CSS, sem lib de gráfico): um segmento de base
 * na cor principal e, opcionalmente, um segmento de destaque (ex.: vencidos)
 * sobreposto à esquerda, proporcional ao total.
 */
export function HorizontalBar({
  value,
  max,
  color,
  highlightValue,
  highlightColor = "red",
}: {
  value: number;
  max: number;
  color: ColorKey;
  highlightValue?: number;
  highlightColor?: ColorKey;
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  const highlightPct = value > 0 && highlightValue ? (highlightValue / value) * 100 : 0;

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("relative h-full rounded-full transition-all", COLOR_DOT_CLASSES[color])}
        style={{ width: `${pct}%` }}
      >
        {highlightPct > 0 && (
          <div
            className={cn("absolute inset-y-0 right-0 rounded-r-full", COLOR_DOT_CLASSES[highlightColor])}
            style={{ width: `${highlightPct}%` }}
          />
        )}
      </div>
    </div>
  );
}

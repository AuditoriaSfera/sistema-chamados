import { cn } from "@/lib/utils";
import { corBadgeClasses, type ColorKey } from "@/lib/color-palette";
import type { LucideIcon } from "lucide-react";

/** Ícone dentro de um badge circular colorido, na mesma paleta usada em SLA/Status/Perfis. */
export function ColorIcon({
  icon: Icon,
  color,
  className,
}: {
  icon: LucideIcon;
  color: ColorKey;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md",
        corBadgeClasses(color),
        className
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

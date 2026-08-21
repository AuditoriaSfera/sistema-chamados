import { Card, CardContent } from "@/components/ui/card";
import { ColorIcon } from "@/components/color-icon";
import type { ColorKey } from "@/lib/color-palette";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Card de métrica com ícone colorido no canto — usado em Relatórios e Monitoramento. */
export function SummaryCard({
  label,
  icon,
  color,
  children,
}: {
  label: string;
  icon: LucideIcon;
  color: ColorKey;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <ColorIcon icon={icon} color={color} />
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

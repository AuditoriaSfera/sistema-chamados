"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { setUsuarioPdvVinculo } from "../actions";

export function PdvVinculoCheckbox({
  usuarioId,
  pdvId,
  label,
  vinculado,
}: {
  usuarioId: string;
  pdvId: string;
  label: string;
  vinculado: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label
      className={cn(
        "flex items-start gap-2 rounded-md border px-2.5 py-2 text-sm leading-tight transition-colors",
        pending ? "opacity-60" : "cursor-pointer hover:bg-muted/50",
        vinculado ? "border-primary/40 bg-primary/5" : "border-border"
      )}
    >
      <Checkbox
        checked={vinculado}
        disabled={pending}
        className="mt-0.5"
        onCheckedChange={(checked) =>
          startTransition(() => setUsuarioPdvVinculo(usuarioId, pdvId, checked === true))
        }
      />
      {label}
    </label>
  );
}

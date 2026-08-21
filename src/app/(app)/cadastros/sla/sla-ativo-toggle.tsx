"use client";

import { Button } from "@/components/ui/button";
import { toggleSlaPresetAtivo } from "./actions";
import { useTransition } from "react";

export function SlaAtivoToggle({ slaId, ativo }: { slaId: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleSlaPresetAtivo(slaId, !ativo))}
    >
      {ativo ? "Inativar" : "Ativar"}
    </Button>
  );
}

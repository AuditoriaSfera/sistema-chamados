"use client";

import { Button } from "@/components/ui/button";
import { togglePdvAtivo } from "./actions";
import { useTransition } from "react";

export function PdvAtivoToggle({ pdvId, ativo }: { pdvId: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => togglePdvAtivo(pdvId, !ativo))}
    >
      {ativo ? "Inativar" : "Ativar"}
    </Button>
  );
}

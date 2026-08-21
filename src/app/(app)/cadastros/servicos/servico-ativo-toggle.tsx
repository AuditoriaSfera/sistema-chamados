"use client";

import { Button } from "@/components/ui/button";
import { toggleServicoAtivo } from "./actions";
import { useTransition } from "react";

export function ServicoAtivoToggle({ servicoId, ativo }: { servicoId: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleServicoAtivo(servicoId, !ativo))}
    >
      {ativo ? "Inativar" : "Ativar"}
    </Button>
  );
}

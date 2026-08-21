"use client";

import { Button } from "@/components/ui/button";
import { toggleStatusAtivo } from "./actions";
import { useTransition } from "react";

export function StatusAtivoToggle({ statusId, ativo }: { statusId: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleStatusAtivo(statusId, !ativo))}
    >
      {ativo ? "Inativar" : "Ativar"}
    </Button>
  );
}

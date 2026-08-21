"use client";

import { Button } from "@/components/ui/button";
import { togglePerfilAtivo } from "./actions";
import { useTransition } from "react";

export function PerfilAtivoToggle({ perfilId, ativo }: { perfilId: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => togglePerfilAtivo(perfilId, !ativo))}
    >
      {ativo ? "Inativar" : "Ativar"}
    </Button>
  );
}

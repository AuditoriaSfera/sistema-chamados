"use client";

import { Button } from "@/components/ui/button";
import { toggleUsuarioAtivo } from "./actions";
import { useTransition } from "react";

export function UsuarioAtivoToggle({ usuarioId, ativo }: { usuarioId: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleUsuarioAtivo(usuarioId, !ativo))}
    >
      {ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}

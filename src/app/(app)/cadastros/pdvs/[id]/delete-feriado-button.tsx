"use client";

import { Button } from "@/components/ui/button";
import { deleteFeriado } from "../actions";
import { useTransition } from "react";

export function DeleteFeriadoButton({ feriadoId, pdvId }: { feriadoId: string; pdvId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => deleteFeriado(feriadoId, pdvId))}
    >
      Remover
    </Button>
  );
}

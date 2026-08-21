"use client";

import { Button } from "@/components/ui/button";
import { assumirChamado } from "./actions";
import { useTransition } from "react";

export function AssumirButton({ chamadoId }: { chamadoId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => assumirChamado(chamadoId))}
    >
      {pending ? "Assumindo..." : "Assumir chamado"}
    </Button>
  );
}

"use client";

import { useTransition } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { assumirChamado } from "./[id]/actions";

export function AssumirIconButton({ chamadoId }: { chamadoId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title="Assumir chamado"
      disabled={pending}
      onClick={() => startTransition(() => assumirChamado(chamadoId))}
      className="inline-flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-50"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
    </button>
  );
}

"use client";

import { useActionState, useRef, useEffect } from "react";
import { createFeriado } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FeriadoCreateForm({ pdvId }: { pdvId: string }) {
  const [state, formAction, pending] = useActionState(createFeriado, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-end gap-3">
      <input type="hidden" name="pdvId" value={pdvId} />
      <div className="space-y-1.5">
        <Input type="date" name="data" required />
      </div>
      <div className="flex-1 space-y-1.5">
        <Input name="descricao" placeholder="Descrição do feriado" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Adicionar"}
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

"use client";

import { useActionState, useRef, useEffect } from "react";
import { createPdv } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DIAS, horarioPadraoDoDia } from "./dias";

export function PdvCreateForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createPdv, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5">
          <Label htmlFor="codigo">Código</Label>
          <Input id="codigo" name="codigo" placeholder="PDV005" required className="w-28" />
        </div>
        <div className="space-y-1.5 flex-1 min-w-40">
          <Label htmlFor="nome">Nome da loja / unidade</Label>
          <Input id="nome" name="nome" placeholder="Loja Oeste" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Horário de funcionamento por dia</Label>
        <div className="space-y-2">
          {DIAS.map((d) => {
            const h = horarioPadraoDoDia(d.value);
            return (
              <div key={d.value} className="flex items-center gap-3">
                <label className="flex w-32 shrink-0 items-center gap-2 text-sm">
                  <Checkbox name={`abre_${d.value}`} defaultChecked={h.abre} />
                  {d.label}
                </label>
                <Input type="time" name={`inicio_${d.value}`} defaultValue={h.horarioInicio} className="w-32" />
                <span className="text-sm text-muted-foreground">até</span>
                <Input type="time" name={`fim_${d.value}`} defaultValue={h.horarioFim} className="w-32" />
              </div>
            );
          })}
        </div>
      </div>

      <input type="hidden" name="regraDistribuicao" value="FILA_ABERTA" />

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Adicionar"}
      </Button>
    </form>
  );
}

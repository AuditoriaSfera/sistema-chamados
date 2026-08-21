"use client";

import { useActionState } from "react";
import { reabrirChamado } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_FINAIS } from "@/lib/constants";

export function ReaberturaPanel({
  chamadoId,
  status,
  finalizadoEm,
  reaberturaPrazoDias,
  podeReaabrir,
}: {
  chamadoId: string;
  status: string;
  finalizadoEm: string | null;
  reaberturaPrazoDias: number;
  podeReaabrir: boolean;
}) {
  const [state, formAction, pending] = useActionState(reabrirChamado, undefined);

  if (!podeReaabrir) return null;
  if (!STATUS_FINAIS.includes(status)) return null;

  const prazoExpirado =
    !!finalizadoEm &&
    new Date() > new Date(new Date(finalizadoEm).getTime() + reaberturaPrazoDias * 86400000);
  if (prazoExpirado) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reabrir chamado</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="chamadoId" value={chamadoId} />
          <Textarea name="motivo" rows={2} placeholder="Motivo da reabertura" required />
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {pending ? "Reabrindo..." : "Reabrir"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

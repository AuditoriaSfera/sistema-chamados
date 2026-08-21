"use client";

import { useActionState } from "react";
import { updateConfigGeral } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ConfigForm({
  reaberturaPrazoDias,
  reaberturaSomenteAdmin,
  alertaVencimentoHoras,
}: {
  reaberturaPrazoDias: number;
  reaberturaSomenteAdmin: boolean;
  alertaVencimentoHoras: number;
}) {
  const [state, formAction, pending] = useActionState(updateConfigGeral, undefined);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regras de reabertura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5 w-48">
            <Label htmlFor="reaberturaPrazoDias">Prazo para reabertura (dias corridos)</Label>
            <Input
              id="reaberturaPrazoDias"
              name="reaberturaPrazoDias"
              type="number"
              min={1}
              max={365}
              defaultValue={reaberturaPrazoDias}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="reaberturaSomenteAdmin" defaultChecked={reaberturaSomenteAdmin} />
            Só Administrador pode reabrir (senão: Admin ou quem abriu o chamado)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alerta visual de vencimento de SLA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1.5 w-64">
            <Label htmlFor="alertaVencimentoHoras">
              Alertar quando faltarem X horas úteis para vencer
            </Label>
            <Input
              id="alertaVencimentoHoras"
              name="alertaVencimentoHoras"
              type="number"
              min={0}
              max={999}
              defaultValue={alertaVencimentoHoras}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Dentro desse prazo, a linha do chamado fica amarela na listagem; depois de vencido,
            vermelha. Ao finalizar ou cancelar, a linha volta à cor padrão.
          </p>
        </CardContent>
      </Card>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}

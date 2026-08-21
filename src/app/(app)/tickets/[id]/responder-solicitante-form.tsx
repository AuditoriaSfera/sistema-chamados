"use client";

import { useActionState } from "react";
import { responderSolicitante } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function ResponderSolicitanteForm({ chamadoId }: { chamadoId: string }) {
  const [state, formAction, pending] = useActionState(responderSolicitante, undefined);

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-base">Responder solicitação</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="chamadoId" value={chamadoId} />
          <div className="space-y-1.5">
            <Label htmlFor="respostaTexto">
              Este chamado está aguardando seu retorno. Envie mais informações:
            </Label>
            <Textarea
              id="respostaTexto"
              name="texto"
              rows={3}
              required
              placeholder="Escreva a resposta solicitada..."
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Enviando..." : "Enviar resposta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useActionState } from "react";
import { changeStatus } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Atalho pra sair de um status com pausa de SLA ativa (ex.: "Resolvido
 * (ressalvas)") direto pra "Em andamento" — a mudança de status genérica
 * (StatusPanel) já permite isso via dropdown, mas essa ação é comum o
 * suficiente pra merecer um botão dedicado, igual ao "Assumir chamado".
 * Retomar o SLA é automático: changeStatus grava de vez o tempo pausado
 * (ver resolverPausaSlaNaTransicao em src/lib/tickets.ts) ao sair do status.
 */
export function MarcarNaoResolvidoButton({ chamadoId }: { chamadoId: string }) {
  const [state, formAction, pending] = useActionState(changeStatus, undefined);
  const [open, setOpen] = useState(false);
  const [processedState, setProcessedState] = useState(state);

  if (state !== processedState) {
    setProcessedState(state);
    if (!state?.error) setOpen(false);
  }

  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <Button className="w-full" onClick={() => setOpen(true)}>
          Marcar como não resolvido
        </Button>
        <p className="text-xs text-muted-foreground">
          Volta o chamado para &quot;Em andamento&quot; e retoma a contagem do SLA.
        </p>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar como não resolvido</DialogTitle>
          </DialogHeader>

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="chamadoId" value={chamadoId} />
            <input type="hidden" name="status" value="EM_ANDAMENTO" />

            <div className="space-y-1.5">
              <Label htmlFor="texto-nao-resolvido">
                Motivo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="texto-nao-resolvido"
                name="texto"
                rows={3}
                required
                placeholder="Explique por que o chamado não foi resolvido..."
                autoFocus
              />
            </div>

            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

            <DialogFooter className="-mx-0 -mb-0 border-0 bg-transparent p-0 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

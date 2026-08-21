"use client";

import { useState } from "react";
import { useActionState } from "react";
import { changeStatus } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_FINAIS } from "@/lib/constants";
import { statusDotClasses } from "@/lib/ticket-badges";
import { cn } from "@/lib/utils";

type StatusOpcao = { id: string; nome: string; cor: string };

export function StatusPanel({
  chamadoId,
  statusAtual,
  statuses,
  somenteOpcoes,
}: {
  chamadoId: string;
  statusAtual: string;
  statuses: StatusOpcao[];
  somenteOpcoes?: string[];
}) {
  const [state, formAction, pending] = useActionState(changeStatus, undefined);
  const [novoStatus, setNovoStatus] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processedState, setProcessedState] = useState(state);

  // Fecha o dialog automaticamente quando a mudança de status é confirmada
  // com sucesso (sem erro retornado pela action) — ajuste de estado durante
  // a renderização em vez de efeito, evitando setState-in-effect.
  if (state !== processedState) {
    setProcessedState(state);
    if (!state?.error) {
      setDialogOpen(false);
      setNovoStatus("");
    }
  }

  const label = (id: string) => statuses.find((s) => s.id === id)?.nome ?? id;

  const todasOpcoes = STATUS_FINAIS.includes(statusAtual)
    ? []
    : statuses.filter((s) => s.id !== statusAtual);
  const opcoes = somenteOpcoes
    ? todasOpcoes.filter((o) => somenteOpcoes.includes(o.id))
    : todasOpcoes;

  if (opcoes.length === 0) return null;

  function handleValueChange(v: string | null) {
    setNovoStatus(v ?? "");
    if (v) setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setNovoStatus("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alterar status</CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          value={novoStatus}
          items={Object.fromEntries(opcoes.map((s) => [s.id, s.nome]))}
          onValueChange={(v) => handleValueChange((v as string | null) ?? null)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o novo status" />
          </SelectTrigger>
          <SelectContent>
            {opcoes.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className={cn("inline-block size-2 shrink-0 rounded-full", statusDotClasses(s.cor))} />
                {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar mudança de status</DialogTitle>
            <DialogDescription>
              Status atual: <strong>{label(statusAtual)}</strong>
              {" → "}
              Novo status: <strong>{label(novoStatus)}</strong>
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="chamadoId" value={chamadoId} />
            <input type="hidden" name="status" value={novoStatus} />

            <div className="space-y-1.5">
              <Label htmlFor="texto">
                Motivo da mudança <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="texto"
                name="texto"
                rows={3}
                required
                placeholder="Descreva o motivo da mudança de status..."
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Preencha o motivo acima e clique em &quot;Confirmar&quot; para efetivar a mudança
                de status. Sem isso, o status não será alterado.
              </p>
            </div>

            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

            <DialogFooter className="-mx-0 -mb-0 border-0 bg-transparent p-0 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={pending}
              >
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

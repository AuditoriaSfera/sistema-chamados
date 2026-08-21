"use client";

import { useActionState, useState } from "react";
import { createSlaPreset } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { UNIDADES_SLA, UNIDADE_SLA_LABELS } from "@/lib/sla-format";

export function NovoSlaDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createSlaPreset, undefined);
  const [processedState, setProcessedState] = useState(state);

  if (state !== processedState) {
    setProcessedState(state);
    if (state && !state.error) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Novo SLA</Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo SLA</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" placeholder="Padrão" required />
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="duracao">Tempo</Label>
              <Input id="duracao" name="duracao" type="number" min={1} required className="w-24" />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="unidade">Unidade</Label>
              <Select name="unidade" defaultValue="HORAS" required items={UNIDADE_SLA_LABELS}>
                <SelectTrigger id="unidade" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES_SLA.map((u) => (
                    <SelectItem key={u} value={u}>
                      {UNIDADE_SLA_LABELS[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">A cor é atribuída automaticamente ao criar.</p>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="critica" />
            Marcar como crítico (aparece no card &quot;Críticos&quot; do Monitoramento)
          </label>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Adicionar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

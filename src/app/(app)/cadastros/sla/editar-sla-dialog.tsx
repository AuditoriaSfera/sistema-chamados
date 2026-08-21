"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Pencil } from "lucide-react";
import { updateSlaPresetInfo } from "./actions";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { UNIDADES_SLA, UNIDADE_SLA_LABELS } from "@/lib/sla-format";

export function EditarSlaDialog({
  sla,
}: {
  sla: { id: string; nome: string; duracao: number; unidade: string; critica: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateSlaPresetInfo, undefined);
  const [processedState, setProcessedState] = useState(state);

  if (state !== processedState) {
    setProcessedState(state);
    if (!state?.error) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon-sm" title="Editar SLA" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar SLA</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="slaId" value={sla.id} />
          <div className="space-y-1.5">
            <Label htmlFor="edit-nome">Nome</Label>
            <Input id="edit-nome" name="nome" defaultValue={sla.nome} required />
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-duracao">Tempo</Label>
              <Input
                id="edit-duracao"
                name="duracao"
                type="number"
                min={1}
                defaultValue={sla.duracao}
                required
                className="w-24"
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="edit-unidade">Unidade</Label>
              <Select name="unidade" defaultValue={sla.unidade} required items={UNIDADE_SLA_LABELS}>
                <SelectTrigger id="edit-unidade" className="w-full">
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
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="critica" defaultChecked={sla.critica} />
            Marcar como crítico (aparece no card &quot;Críticos&quot; do Monitoramento)
          </label>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter className="-mx-0 -mb-0 border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

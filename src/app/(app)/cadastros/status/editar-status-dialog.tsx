"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Pencil } from "lucide-react";
import { updateStatusNome } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EditarStatusDialog({ status }: { status: { id: string; nome: string } }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateStatusNome, undefined);
  const [processedState, setProcessedState] = useState(state);

  if (state !== processedState) {
    setProcessedState(state);
    if (!state?.error) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon-sm" title="Editar status" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar status</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="statusId" value={status.id} />
          <div className="space-y-1.5">
            <Label htmlFor="edit-nome">Nome</Label>
            <Input id="edit-nome" name="nome" defaultValue={status.nome} required />
          </div>
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

"use client";

import { useActionState, useState } from "react";
import { createStatus } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function NovoStatusDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createStatus, undefined);
  const [processedState, setProcessedState] = useState(state);

  if (state !== processedState) {
    setProcessedState(state);
    if (state && !state.error) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Novo status</Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo status</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" placeholder="Aguardando peça" required />
          </div>
          <p className="text-xs text-muted-foreground">A cor é atribuída automaticamente ao criar.</p>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Adicionar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

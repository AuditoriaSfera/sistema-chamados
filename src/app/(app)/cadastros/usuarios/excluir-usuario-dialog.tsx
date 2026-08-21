"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { deleteUsuario } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ExcluirUsuarioDialog({ usuario }: { usuario: { id: string; nome: string } }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteUsuario, undefined);
  const [processedState, setProcessedState] = useState(state);

  if (state !== processedState) {
    setProcessedState(state);
    if (!state?.error) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Excluir usuário"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir usuário</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir <strong>{usuario.nome}</strong>? Essa ação não pode ser
            desfeita. Usuários com chamados ou mensagens vinculados não podem ser excluídos —
            desative-os em vez disso.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="usuarioId" value={usuario.id} />
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter className="-mx-0 -mb-0 border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

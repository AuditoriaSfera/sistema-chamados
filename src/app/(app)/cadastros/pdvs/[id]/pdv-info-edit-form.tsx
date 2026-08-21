"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { updatePdvInfo } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PdvInfoEditForm({
  pdv,
  defaultOpen,
}: {
  pdv: { id: string; codigo: string; nome: string };
  defaultOpen?: boolean;
}) {
  const [editando, setEditando] = useState(defaultOpen ?? false);
  const [state, formAction, pending] = useActionState(updatePdvInfo, undefined);
  const [stateProcessado, setStateProcessado] = useState(state);

  if (state !== stateProcessado) {
    setStateProcessado(state);
    if (state && !state.error) setEditando(false);
  }

  if (!editando) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">
          {pdv.codigo} — {pdv.nome}
        </h1>
        <Button variant="ghost" size="icon-sm" title="Editar PDV" onClick={() => setEditando(true)}>
          <Pencil className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Editar PDV</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="pdvId" value={pdv.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-codigo">Código</Label>
              <Input id="edit-codigo" name="codigo" defaultValue={pdv.codigo} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-nome">Nome da loja / unidade</Label>
              <Input id="edit-nome" name="nome" defaultValue={pdv.nome} required />
            </div>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

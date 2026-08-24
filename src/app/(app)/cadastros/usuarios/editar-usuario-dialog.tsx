"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Pencil } from "lucide-react";
import { updateUsuario } from "./actions";
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
type Perfil = { id: string; nome: string };

export function EditarUsuarioDialog({
  usuario,
  perfis,
}: {
  usuario: {
    id: string;
    nome: string;
    email: string;
    emailContato: string | null;
    telefone: string | null;
    perfil: string;
  };
  perfis: Perfil[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateUsuario, undefined);
  const [processedState, setProcessedState] = useState(state);

  if (state !== processedState) {
    setProcessedState(state);
    if (!state?.error) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon-sm" title="Editar usuário" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="usuarioId" value={usuario.id} />
          <div className="space-y-1.5">
            <Label htmlFor="edit-nome">Nome</Label>
            <Input id="edit-nome" name="nome" defaultValue={usuario.nome} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Usuário</Label>
            <Input id="edit-email" name="email" type="text" defaultValue={usuario.email} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-emailContato">E-mail de contato</Label>
            <Input
              id="edit-emailContato"
              name="emailContato"
              type="email"
              defaultValue={usuario.emailContato ?? ""}
              placeholder="nome@sferamultifranquias.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-telefone">Telefone de contato</Label>
            <Input
              id="edit-telefone"
              name="telefone"
              type="tel"
              defaultValue={usuario.telefone ?? ""}
              placeholder="(11) 91234-5678"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-perfil">Perfil</Label>
            <Select
              name="perfil"
              required
              defaultValue={usuario.perfil}
              items={Object.fromEntries(perfis.map((p) => [p.id, p.nome]))}
            >
              <SelectTrigger id="edit-perfil" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {perfis.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-senha">Nova senha (opcional)</Label>
            <Input id="edit-senha" name="senha" type="password" minLength={6} placeholder="Deixe em branco para manter" />
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

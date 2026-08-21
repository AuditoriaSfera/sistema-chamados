"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Pencil } from "lucide-react";
import { updatePerfil } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const VISIBILIDADE = [
  { name: "veTodosChamados", label: "Ver todos os chamados" },
  { name: "veChamadosPdvsVinculados", label: "Ver chamados dos PDVs vinculados ao usuário" },
] as const;

const PERMISSOES = [
  { name: "podeAbrirChamado", label: "Abrir chamado" },
  { name: "podeAlterarStatus", label: "Alterar status do chamado" },
  { name: "podeResponderChat", label: "Responder no chat" },
  { name: "podeCancelarReabrirProprio", label: "Cancelar/reabrir chamado próprio" },
  { name: "podeCancelarReabrirTodos", label: "Cancelar/reabrir chamado de outros usuários" },
  { name: "podeVerRelatorios", label: "Ver relatórios e monitoramento" },
  { name: "podeGerenciarCadastros", label: "Gerenciar cadastros (PDVs, Serviços, Status, SLA, Usuários, Perfis)" },
] as const;

type Perfil = {
  id: string;
  nome: string;
  podeAbrirChamado: boolean;
  podeAlterarStatus: boolean;
  podeResponderChat: boolean;
  podeCancelarReabrirProprio: boolean;
  podeCancelarReabrirTodos: boolean;
  podeVerRelatorios: boolean;
  podeGerenciarCadastros: boolean;
  veTodosChamados: boolean;
  veChamadosPdvsVinculados: boolean;
};

export function EditarPerfilDialog({ perfil }: { perfil: Perfil }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updatePerfil, undefined);
  const [processedState, setProcessedState] = useState(state);

  if (state !== processedState) {
    setProcessedState(state);
    if (!state?.error) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon-sm" title="Editar perfil" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
      </Button>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="perfilId" value={perfil.id} />
          <div className="space-y-1.5">
            <Label htmlFor="edit-nome">Nome</Label>
            <Input id="edit-nome" name="nome" defaultValue={perfil.nome} required />
          </div>
          <div className="space-y-2">
            <Label>Visibilidade de chamados</Label>
            {VISIBILIDADE.map((p) => (
              <label key={p.name} className="flex items-center gap-2 text-sm">
                <Checkbox name={p.name} defaultChecked={perfil[p.name]} />
                {p.label}
              </label>
            ))}
            <p className="text-xs text-muted-foreground">
              Se nenhuma marcada, o perfil só vê os chamados que o próprio usuário abriu.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Permissões</Label>
            {PERMISSOES.map((p) => (
              <label key={p.name} className="flex items-center gap-2 text-sm">
                <Checkbox name={p.name} defaultChecked={perfil[p.name]} />
                {p.label}
              </label>
            ))}
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

"use client";

import { useActionState, useState } from "react";
import { createPerfil } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export function NovoPerfilDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createPerfil, undefined);
  const [processedState, setProcessedState] = useState(state);

  if (state !== processedState) {
    setProcessedState(state);
    if (state && !state.error) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Novo perfil</Button>} />
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo perfil</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" placeholder="Auditor" required />
          </div>
          <div className="space-y-2">
            <Label>Visibilidade de chamados</Label>
            {VISIBILIDADE.map((p) => (
              <label key={p.name} className="flex items-center gap-2 text-sm">
                <Checkbox name={p.name} />
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
                <Checkbox name={p.name} />
                {p.label}
              </label>
            ))}
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

"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Pencil } from "lucide-react";
import { updatePerfil } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PERMISSOES = [
  { name: "podeAbrirChamado", label: "Abrir chamado" },
  { name: "podeAlterarStatus", label: "Alterar status do chamado" },
  { name: "podeResponderChat", label: "Responder no chat" },
  { name: "podeCancelarReabrirProprio", label: "Cancelar/reabrir chamado próprio" },
  { name: "podeCancelarReabrirTodos", label: "Cancelar/reabrir chamado de outros usuários" },
  { name: "podeVerRelatorios", label: "Ver relatórios e monitoramento" },
] as const;

// Permissões que tornam o perfil administrativo. Só quem já é administrador
// pleno consegue marcá-las — o servidor recusa a concessão de qualquer uma
// delas por quem não tem podeGerenciarAdministradores (ver actions.ts).
const PERMISSOES_ADMIN = [
  {
    name: "podeGerenciarCadastros",
    label: "Gerenciar cadastros (PDVs, Serviços, Status, SLA, Usuários, Perfis)",
  },
  {
    name: "podeGerenciarAdministradores",
    label: "Gerenciar administradores, configurações e auditoria",
  },
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
  podeGerenciarAdministradores: boolean;
  veSomenteProprios: boolean;
};

export function EditarPerfilDialog({
  perfil,
  podeGerenciarAdministradores,
}: {
  perfil: Perfil;
  podeGerenciarAdministradores: boolean;
}) {
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
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="veSomenteProprios" defaultChecked={perfil.veSomenteProprios} />
              Só os chamados que o usuário abriu
            </label>
            <p className="text-xs text-muted-foreground">
              Desmarcado, o usuário vê os chamados de todo mundo do(s) PDV(s) vinculados a ele.
              O vínculo por PDV sempre se aplica, em qualquer um dos dois casos.
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
          <div className="space-y-2">
            <Label>Administração</Label>
            {PERMISSOES_ADMIN.map((p) => (
              <label
                key={p.name}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  !podeGerenciarAdministradores && "opacity-50"
                )}
              >
                <Checkbox name={p.name} disabled={!podeGerenciarAdministradores} defaultChecked={perfil[p.name]} />
                {p.label}
              </label>
            ))}
            {!podeGerenciarAdministradores && (
              <p className="text-xs text-muted-foreground">
                Só um administrador pleno concede estas permissões.
              </p>
            )}
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

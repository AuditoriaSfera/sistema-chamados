"use client";

import { useActionState, useRef, useEffect } from "react";
import { createUsuario } from "./actions";
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
type Perfil = { id: string; nome: string };

export function UsuarioCreateForm({
  perfis,
  onSuccess,
}: {
  perfis: Perfil[];
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createUsuario, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Usuário</Label>
          <Input id="email" name="email" type="text" placeholder="Nome, número ou e-mail" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="senha">Senha inicial</Label>
          <Input id="senha" name="senha" type="password" minLength={6} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="perfil">Perfil</Label>
          <Select
            name="perfil"
            required
            defaultValue={perfis[0]?.id}
            items={Object.fromEntries(perfis.map((p) => [p.id, p.nome]))}
          >
            <SelectTrigger id="perfil" className="w-full">
              <SelectValue placeholder="Selecione" />
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
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Criar usuário"}
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <p className="text-xs text-muted-foreground">
        O usuário precisará trocar essa senha no primeiro acesso. Vínculo com PDV(s) e
        visibilidade de chamados da equipe são configurados depois, na página de detalhe do
        usuário.
      </p>
    </form>
  );
}

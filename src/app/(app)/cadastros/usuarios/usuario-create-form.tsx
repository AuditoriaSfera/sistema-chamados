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

const CONECTORES = new Set(["de", "da", "do", "das", "dos", "e"]);
const MARCAS_DIACRITICAS = new RegExp("[\\u0300-\\u036f]", "g");

/** "João da Silva" -> "joao.silva" — sugestão de usuário a partir do nome. */
function sugerirUsuario(nome: string): string {
  const palavras = nome
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => /^[a-z]+$/.test(p));
  if (palavras.length === 0) return "";
  const [primeiro, ...resto] = palavras;
  const sobrenome = resto.filter((p) => !CONECTORES.has(p)).pop();
  return sobrenome ? `${primeiro}.${sobrenome}` : primeiro;
}

export function UsuarioCreateForm({
  perfis,
  onSuccess,
}: {
  perfis: Perfil[];
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createUsuario, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const usuarioInputRef = useRef<HTMLInputElement>(null);
  const usuarioEditadoManualmente = useRef(false);

  useEffect(() => {
    if (state && !state.error) {
      formRef.current?.reset();
      usuarioEditadoManualmente.current = false;
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            name="nome"
            required
            autoComplete="off"
            onChange={(e) => {
              if (!usuarioEditadoManualmente.current && usuarioInputRef.current) {
                usuarioInputRef.current.value = sugerirUsuario(e.target.value);
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Usuário</Label>
          <Input
            ref={usuarioInputRef}
            id="email"
            name="email"
            type="text"
            placeholder="Nome, número ou e-mail"
            required
            autoComplete="off"
            // Só conta como edição manual quando é o próprio usuário digitando ou
            // colando — o autofill do navegador dispara "onChange" mas não essas
            // duas, então não trava a sugestão antes de o admin realmente mexer.
            onKeyDown={() => {
              usuarioEditadoManualmente.current = true;
            }}
            onPaste={() => {
              usuarioEditadoManualmente.current = true;
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="emailContato">E-mail de contato (opcional)</Label>
          <Input
            id="emailContato"
            name="emailContato"
            type="email"
            placeholder="nome@sferamultifranquias.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="telefone">Telefone de contato (opcional)</Label>
          <Input id="telefone" name="telefone" type="tel" placeholder="(11) 91234-5678" />
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
        O usuário precisará trocar essa senha no primeiro acesso. E-mail e telefone de contato
        são opcionais e, quando informados, também servem para recuperar a senha. Vínculo com
        PDV(s) e visibilidade de chamados da equipe são configurados depois, na página de
        detalhe do usuário.
      </p>
    </form>
  );
}

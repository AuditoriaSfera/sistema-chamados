"use client";

import { useActionState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { alterarPropriaSenha } from "../actions";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";

export function AlterarSenhaForm() {
  const [state, formAction, pending] = useActionState(alterarPropriaSenha, undefined);

  useEffect(() => {
    if (state && !state.error) {
      signOut({ redirectTo: "/login?senhaAlterada=1" });
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="senhaAtual">Senha atual</Label>
        <PasswordInput id="senhaAtual" name="senhaAtual" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="novaSenha">Nova senha</Label>
        <PasswordInput id="novaSenha" name="novaSenha" minLength={6} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
        <PasswordInput id="confirmarSenha" name="confirmarSenha" minLength={6} required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Trocar senha"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Ao trocar a senha, você será desconectado e precisará entrar novamente.
      </p>
    </form>
  );
}

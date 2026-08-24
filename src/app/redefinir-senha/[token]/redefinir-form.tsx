"use client";

import Link from "next/link";
import { useActionState } from "react";
import { redefinirSenhaAction } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function RedefinirForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(redefinirSenhaAction, undefined);

  if (state?.ok) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-foreground">Senha alterada com sucesso.</p>
          <Link href="/login" className={buttonVariants({ className: "w-full" })}>
            Entrar
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <div className="space-y-2">
            <Label htmlFor="novaSenha">Nova senha</Label>
            <PasswordInput id="novaSenha" name="novaSenha" minLength={6} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
            <PasswordInput id="confirmarSenha" name="confirmarSenha" minLength={6} required />
          </div>
          {state?.erro && <p className="text-sm text-destructive">{state.erro}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Salvando..." : "Redefinir senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

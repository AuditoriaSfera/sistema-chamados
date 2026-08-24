"use client";

import Link from "next/link";
import { useActionState } from "react";
import { pedirRecuperacao } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function EsqueciSenhaForm() {
  const [state, formAction, pending] = useActionState(pedirRecuperacao, undefined);

  if (state?.enviado) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-foreground">
            Se houver uma conta com esse usuário ou e-mail, enviamos um link para
            redefinir a senha. Verifique a caixa de entrada e o spam.
          </p>
          <p className="text-xs text-muted-foreground">O link vale por 1 hora.</p>
          <Link href="/login" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identificador">Usuário ou e-mail</Label>
            <Input id="identificador" name="identificador" type="text" required autoFocus />
          </div>
          {state?.erro && <p className="text-sm text-destructive">{state.erro}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
          <Link href="/login" className={buttonVariants({ variant: "ghost", className: "w-full" })}>
            Voltar para o login
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}

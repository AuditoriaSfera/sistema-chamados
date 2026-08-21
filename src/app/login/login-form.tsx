"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <div className="space-y-2">
            <Label htmlFor="email">Usuário</Label>
            <Input id="email" name="email" type="text" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" name="senha" type="password" required />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

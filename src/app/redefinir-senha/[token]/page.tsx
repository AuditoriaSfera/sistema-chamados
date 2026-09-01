import Link from "next/link";
import { validarToken } from "@/lib/senha-reset";
import { RedefinirForm } from "./redefinir-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function RedefinirSenhaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const valido = await validarToken(token);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-1/3 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-primary/15 blur-[100px]" />
      <div className="relative w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <img src="/logo-s.png" alt="" className="mx-auto size-14" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nova senha</h1>
        </div>
        {valido ? (
          <RedefinirForm token={token} />
        ) : (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-foreground">
                Este link expirou ou já foi utilizado.
              </p>
              <p className="text-xs text-muted-foreground">
                Os links valem por 1 hora e servem para um único uso.
              </p>
              <Link
                href="/esqueci-senha"
                className={buttonVariants({ variant: "outline", className: "w-full" })}
              >
                Pedir um novo link
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

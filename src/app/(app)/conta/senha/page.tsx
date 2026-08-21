import { requireUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlterarSenhaForm } from "./alterar-senha-form";

export default async function AlterarSenhaPage() {
  const user = await requireUser();

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Alterar senha</h1>
        <p className="text-sm text-muted-foreground">
          {user.senhaProvisoria
            ? "Você está usando uma senha provisória. Defina uma nova senha para continuar."
            : "Troque sua senha de acesso quando quiser."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova senha</CardTitle>
        </CardHeader>
        <CardContent>
          <AlterarSenhaForm />
        </CardContent>
      </Card>
    </div>
  );
}

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { ConfigForm } from "./config-form";

export default async function ConfiguracoesPage() {
  await requireAdmin();

  const config = await prisma.configGeral.upsert({
    where: { id: "geral" },
    update: {},
    create: { id: "geral" },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Configurações</h1>
          <p className="text-sm text-muted-foreground">Regras gerais do sistema.</p>
        </div>
        <Link href="/configuracoes/auditoria" className="text-sm text-primary hover:underline">
          Ver auditoria →
        </Link>
      </div>

      <ConfigForm
        reaberturaPrazoDias={config.reaberturaPrazoDias}
        reaberturaSomenteAdmin={config.reaberturaSomenteAdmin}
        alertaVencimentoHoras={config.alertaVencimentoHoras}
      />
    </div>
  );
}

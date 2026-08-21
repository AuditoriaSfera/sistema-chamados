import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canOpenTicket } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { TicketCreateForm } from "./ticket-create-form";

export default async function NovoChamadoPage() {
  const user = await requireUser();
  if (!canOpenTicket(user)) redirect("/tickets");

  const [servicos, pdvs] = await Promise.all([
    prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      include: {
        slaPreset: true,
      },
    }),
    prisma.pdv.findMany({
      where: { ativo: true },
      orderBy: { codigo: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/tickets"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para chamados
        </Link>
        <h1 className="text-xl font-semibold">Abrir chamado</h1>
        <p className="text-sm text-muted-foreground">
          O chamado é roteado automaticamente para a fila do PDV selecionado.
        </p>
      </div>
      <TicketCreateForm
        servicos={servicos}
        pdvs={pdvs}
        abertoPorEmail={user.email}
        abertoPorNome={user.nome}
      />
    </div>
  );
}

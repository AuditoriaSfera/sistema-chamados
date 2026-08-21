import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ServicoEditForm } from "../servico-edit-form";
import { formatarDuracaoSla } from "@/lib/sla-format";

export default async function ServicoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const servico = await prisma.servico.findUnique({
    where: { id },
    include: { slaPreset: true },
  });
  if (!servico) notFound();

  const slaPresets = await prisma.slaPreset.findMany({
    where: { OR: [{ ativo: true }, { id: servico.slaPresetId }] },
    orderBy: { ordem: "asc" },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/cadastros/servicos"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para Serviços
        </Link>
        <h1 className="text-xl font-semibold">{servico.nome}</h1>
        <p className="text-sm text-muted-foreground">{servico.categoria}</p>
        {servico.textoOrientacao && (
          <p className="text-sm text-muted-foreground mt-1">{servico.textoOrientacao}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          SLA: {servico.slaPreset.nome} —{" "}
          {formatarDuracaoSla(servico.slaPreset.duracao, servico.slaPreset.unidade)}
        </p>
      </div>

      <div className="flex justify-end">
        <ServicoEditForm
          servico={servico}
          slaPresets={slaPresets}
          defaultOpen={sp.editar === "1"}
        />
      </div>
    </div>
  );
}

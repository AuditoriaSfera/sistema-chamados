import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarioForm } from "./calendario-form";
import { FeriadoCreateForm } from "./feriado-create-form";
import { DeleteFeriadoButton } from "./delete-feriado-button";
import { PdvInfoEditForm } from "./pdv-info-edit-form";

export default async function PdvDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const pdv = await prisma.pdv.findUnique({
    where: { id },
    include: {
      feriados: { orderBy: { data: "asc" } },
      horarios: { orderBy: { diaSemana: "asc" } },
    },
  });
  if (!pdv) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/cadastros/pdvs"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para PDVs
        </Link>
        <PdvInfoEditForm pdv={pdv} defaultOpen={sp.editar === "1"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendário útil e distribuição</CardTitle>
          <p className="text-sm text-muted-foreground">
            O prazo de SLA é contado dentro desse horário e nesses dias — feriados e fora do
            expediente não contam.
          </p>
        </CardHeader>
        <CardContent>
          <CalendarioForm
            pdvId={pdv.id}
            horarios={pdv.horarios}
            regraDistribuicao={pdv.regraDistribuicao}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feriados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FeriadoCreateForm pdvId={pdv.id} />
          <Table className="[&_th]:h-7 [&_th]:bg-muted/50 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pdv.feriados.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.data.toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{f.descricao}</TableCell>
                  <TableCell>
                    <DeleteFeriadoButton feriadoId={f.id} pdvId={pdv.id} />
                  </TableCell>
                </TableRow>
              ))}
              {pdv.feriados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-4">
                    Nenhum feriado cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

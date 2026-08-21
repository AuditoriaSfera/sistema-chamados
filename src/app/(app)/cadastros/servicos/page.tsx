import Link from "next/link";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { corBadgeClasses, corDotClasses } from "@/lib/color-palette";
import { duracaoSlaEmHoras, formatarDuracaoSla } from "@/lib/sla-format";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { SortableHead, SortToggle } from "@/components/sortable-head";
import { NovoServicoDialog } from "./novo-servico-dialog";
import { ServicoAtivoToggle } from "./servico-ativo-toggle";
import { ExcluirServicoDialog } from "./excluir-servico-dialog";

const HEADER_CLASSES =
  "text-xs [&_td]:text-xs [&_th]:h-7 [&_th]:bg-muted/50 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase";

const BASE_PATH = "/cadastros/servicos";

export default async function ServicosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const [todos, slaPresets] = await Promise.all([
    prisma.servico.findMany({ include: { slaPreset: true } }),
    prisma.slaPreset.findMany({ where: { ativo: true }, orderBy: { ordem: "asc" } }),
  ]);

  const ativoValues = new Set((sp.ativo ?? "").split(",").filter(Boolean));
  const nomeValues = new Set((sp.id ?? "").split(",").filter(Boolean));
  const filtrados = todos.filter(
    (s) =>
      (ativoValues.size === 0 || ativoValues.has(String(Number(s.ativo)))) &&
      (nomeValues.size === 0 || nomeValues.has(s.id))
  );

  const campo = sp.sort ?? "nome";
  const direcao = sp.sort ? (sp.dir === "asc" ? 1 : -1) : 1;
  const servicos = [...filtrados].sort((a, b) => {
    let cmp = 0;
    if (campo === "sla")
      cmp =
        duracaoSlaEmHoras(a.slaPreset.duracao, a.slaPreset.unidade) -
        duracaoSlaEmHoras(b.slaPreset.duracao, b.slaPreset.unidade);
    else if (campo === "ativo") cmp = Number(a.ativo) - Number(b.ativo);
    else cmp = a.nome.localeCompare(b.nome);
    return direcao * cmp;
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Serviços / Tipos de ocorrência</h1>
          <p className="text-sm text-muted-foreground">
            Cada serviço tem um SLA vinculado. Clique em um serviço para configurar.
          </p>
        </div>
        {slaPresets.length > 0 ? (
          <NovoServicoDialog slaPresets={slaPresets} />
        ) : (
          <p className="max-w-56 text-xs text-muted-foreground">
            Cadastre pelo menos um SLA (menu ao lado) antes de criar um serviço.
          </p>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table className={HEADER_CLASSES}>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">
                  <div className="inline-flex items-center gap-1">
                    <MultiSelectFilter
                      paramName="id"
                      label="Nome"
                      options={todos.map((s) => ({ value: s.id, label: s.nome }))}
                    />
                    <SortToggle basePath={BASE_PATH} sp={sp} campo="nome" />
                  </div>
                </TableHead>
                <SortableHead basePath={BASE_PATH} sp={sp} campo="sla">
                  SLA
                </SortableHead>
                <TableHead className="text-center">
                  <div className="inline-flex items-center gap-1">
                    <MultiSelectFilter
                      paramName="ativo"
                      label="Status do cadastro"
                      options={[
                        { value: "1", label: "Ativo" },
                        { value: "0", label: "Inativo" },
                      ]}
                    />
                    <SortToggle basePath={BASE_PATH} sp={sp} campo="ativo" />
                  </div>
                </TableHead>
                <TableHead className="text-center">Ações</TableHead>
                <TableHead className="text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicos.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-center">
                    <Link href={`/cadastros/servicos/${s.id}`} className="font-medium hover:underline">
                      {s.nome}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={corBadgeClasses(s.slaPreset.cor)}>
                      <span
                        className={`mr-1 inline-block size-2 rounded-full ${corDotClasses(s.slaPreset.cor)}`}
                      />
                      {s.slaPreset.nome} — {formatarDuracaoSla(s.slaPreset.duracao, s.slaPreset.unidade)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={s.ativo ? "default" : "secondary"}>
                      {s.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/cadastros/servicos/${s.id}?editar=1`}
                        title="Editar serviço"
                        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <ExcluirServicoDialog servico={s} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <ServicoAtivoToggle servicoId={s.id} ativo={s.ativo} />
                  </TableCell>
                </TableRow>
              ))}
              {servicos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                    Nenhum serviço cadastrado.
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

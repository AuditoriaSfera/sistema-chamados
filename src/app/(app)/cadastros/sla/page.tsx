import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { corBadgeClasses, corDotClasses } from "@/lib/color-palette";
import { duracaoSlaEmHoras, formatarDuracaoSla } from "@/lib/sla-format";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { SortableHead, SortToggle } from "@/components/sortable-head";
import { NovoSlaDialog } from "./novo-sla-dialog";
import { SlaAtivoToggle } from "./sla-ativo-toggle";
import { EditarSlaDialog } from "./editar-sla-dialog";
import { ExcluirSlaDialog } from "./excluir-sla-dialog";

const HEADER_CLASSES =
  "text-xs [&_td]:text-xs [&_th]:h-7 [&_th]:bg-muted/50 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase";

const BASE_PATH = "/cadastros/sla";

export default async function SlaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const ativoValues = new Set((sp.ativo ?? "").split(",").filter(Boolean));
  const todos = await prisma.slaPreset.findMany();
  const filtrados =
    ativoValues.size === 1 ? todos.filter((s) => s.ativo === ativoValues.has("1")) : todos;

  const campo = sp.sort ?? "tempo";
  const direcao = sp.sort ? (sp.dir === "asc" ? 1 : -1) : 1;
  const slas = [...filtrados].sort((a, b) => {
    let cmp = 0;
    if (campo === "nome") cmp = a.nome.localeCompare(b.nome);
    else if (campo === "critica") cmp = Number(a.critica) - Number(b.critica);
    else if (campo === "ativo") cmp = Number(a.ativo) - Number(b.ativo);
    else cmp = duracaoSlaEmHoras(a.duracao, a.unidade) - duracaoSlaEmHoras(b.duracao, b.unidade);
    return direcao * cmp;
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">SLA</h1>
          <p className="text-sm text-muted-foreground">
            Prazos e prioridades disponíveis para vincular a cada Serviço. Cada um recebe uma cor
            automaticamente.
          </p>
        </div>
        <NovoSlaDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table className={HEADER_CLASSES}>
            <TableHeader>
              <TableRow>
                <SortableHead basePath={BASE_PATH} sp={sp} campo="nome">
                  Nome
                </SortableHead>
                <SortableHead basePath={BASE_PATH} sp={sp} campo="tempo">
                  Tempo
                </SortableHead>
                <SortableHead basePath={BASE_PATH} sp={sp} campo="critica">
                  Crítico
                </SortableHead>
                <TableHead className="text-center">
                  <div className="inline-flex items-center gap-1">
                    <MultiSelectFilter
                      paramName="ativo"
                      label="Status"
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
              {slas.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-center">
                    <Link href={`/tickets?sla=${s.id}`}>
                      <Badge variant="outline" className={corBadgeClasses(s.cor)}>
                        <span className={`mr-1 inline-block size-2 rounded-full ${corDotClasses(s.cor)}`} />
                        {s.nome}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">{formatarDuracaoSla(s.duracao, s.unidade)}</TableCell>
                  <TableCell className="text-center">{s.critica ? "Sim" : "—"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={s.ativo ? "default" : "secondary"}>
                      {s.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <EditarSlaDialog sla={s} />
                      <ExcluirSlaDialog sla={s} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <SlaAtivoToggle slaId={s.id} ativo={s.ativo} />
                  </TableCell>
                </TableRow>
              ))}
              {slas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    Nenhum SLA cadastrado.
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

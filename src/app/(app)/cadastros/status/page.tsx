import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { corBadgeClasses, corDotClasses } from "@/lib/color-palette";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { SortableHead, SortToggle } from "@/components/sortable-head";
import { NovoStatusDialog } from "./novo-status-dialog";
import { EditarStatusDialog } from "./editar-status-dialog";
import { ExcluirStatusDialog } from "./excluir-status-dialog";
import { StatusAtivoToggle } from "./status-ativo-toggle";

const HEADER_CLASSES =
  "text-xs [&_td]:text-xs [&_th]:h-7 [&_th]:bg-muted/50 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase";

const BASE_PATH = "/cadastros/status";

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const ativoValues = new Set((sp.ativo ?? "").split(",").filter(Boolean));
  const nomeValues = new Set((sp.id ?? "").split(",").filter(Boolean));
  const todos = await prisma.status.findMany({ orderBy: { ordem: "asc" } });
  const filtrados = todos.filter(
    (s) =>
      (ativoValues.size === 0 || ativoValues.has(String(Number(s.ativo)))) &&
      (nomeValues.size === 0 || nomeValues.has(s.id))
  );

  let statuses = filtrados;
  if (sp.sort) {
    const direcao = sp.dir === "asc" ? 1 : -1;
    statuses = [...filtrados].sort((a, b) => {
      let cmp = 0;
      if (sp.sort === "nome") cmp = a.nome.localeCompare(b.nome);
      else if (sp.sort === "fixo") cmp = Number(a.fixo) - Number(b.fixo);
      else if (sp.sort === "ativo") cmp = Number(a.ativo) - Number(b.ativo);
      return direcao * cmp;
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Status</h1>
          <p className="text-sm text-muted-foreground">
            Status do fluxo do chamado. Os 7 status originais são fixos; novos status entram como
            opções adicionais ao mudar o status de um chamado.
          </p>
        </div>
        <NovoStatusDialog />
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
                      label="Status"
                      options={todos.map((s) => ({
                        value: s.id,
                        label: s.nome,
                        dotClassName: corDotClasses(s.cor),
                      }))}
                    />
                    <SortToggle basePath={BASE_PATH} sp={sp} campo="nome" />
                  </div>
                </TableHead>
                <SortableHead basePath={BASE_PATH} sp={sp} campo="fixo">
                  Fixo
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
              {statuses.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={corBadgeClasses(s.cor)}>
                      <span
                        className={`mr-1 inline-block size-2 rounded-full ${corDotClasses(s.cor)}`}
                      />
                      {s.nome}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{s.fixo ? "Sim" : "—"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={s.ativo ? "default" : "secondary"}>
                      {s.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {s.fixo ? (
                      "—"
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <EditarStatusDialog status={s} />
                        <ExcluirStatusDialog status={s} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {s.fixo ? "—" : <StatusAtivoToggle statusId={s.id} ativo={s.ativo} />}
                  </TableCell>
                </TableRow>
              ))}
              {statuses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                    Nenhum status cadastrado.
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

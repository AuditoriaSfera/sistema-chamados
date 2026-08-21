import Link from "next/link";
import { Pencil, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { cn } from "@/lib/utils";
import { NovoPdvDialog } from "./novo-pdv-dialog";
import { PdvAtivoToggle } from "./pdv-ativo-toggle";
import { ExcluirPdvDialog } from "./excluir-pdv-dialog";

const HEADER_CLASSES =
  "text-xs [&_td]:text-xs [&_th]:h-7 [&_th]:bg-muted/50 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase";

const SORT_FIELDS = ["codigo", "nome"] as const;
type SortField = (typeof SORT_FIELDS)[number];

function statusCardHref(sp: Record<string, string | undefined>, status: string) {
  const ativo = sp.status === status;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "status") params.set(k, v);
  }
  if (!ativo) params.set("status", status);
  const query = params.toString();
  return query ? `/cadastros/pdvs?${query}` : "/cadastros/pdvs";
}

function sortHref(sp: Record<string, string | undefined>, campo: SortField) {
  const ativo = sp.sort === campo;
  const novaDirecao = ativo && sp.dir === "asc" ? "desc" : "asc";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "sort" && k !== "dir") params.set(k, v);
  }
  params.set("sort", campo);
  params.set("dir", novaDirecao);
  return `/cadastros/pdvs?${params.toString()}`;
}

function SortableHead({
  sp,
  campo,
  children,
}: {
  sp: Record<string, string | undefined>;
  campo: SortField;
  children: React.ReactNode;
}) {
  const ativo = sp.sort === campo;
  const Icone = ativo ? (sp.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead className="text-center">
      <Link
        href={sortHref(sp, campo)}
        scroll={false}
        className={cn(
          "inline-flex items-center gap-1 hover:underline",
          ativo && "text-primary"
        )}
      >
        {children}
        <Icone className="size-3.5" />
      </Link>
    </TableHead>
  );
}

export default async function PdvsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const statusValues = (sp.status ?? "").split(",").filter(Boolean);
  const where =
    statusValues.length > 0 && statusValues.length < 2
      ? { ativo: statusValues[0] === "ATIVO" }
      : {};

  const campo: SortField = SORT_FIELDS.includes(sp.sort as SortField) ? (sp.sort as SortField) : "codigo";
  const direcao = sp.dir === "desc" ? "desc" : "asc";

  const [pdvs, totalAtivos, totalInativos] = await Promise.all([
    prisma.pdv.findMany({ where, orderBy: { [campo]: direcao } }),
    prisma.pdv.count({ where: { ativo: true } }),
    prisma.pdv.count({ where: { ativo: false } }),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">PDVs</h1>
          <p className="text-sm text-muted-foreground">
            Cada PDV é a própria unidade de atendimento — calendário, SLA e distribuição de
            chamados são configurados na página de cada um.
          </p>
        </div>
        <NovoPdvDialog />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:w-80">
        <Link href={statusCardHref(sp, "ATIVO")}>
          <Card className={cn("transition-colors hover:bg-muted/50", sp.status === "ATIVO" && "ring-2 ring-primary")}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Ativos</p>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {totalAtivos}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href={statusCardHref(sp, "INATIVO")}>
          <Card className={cn("transition-colors hover:bg-muted/50", sp.status === "INATIVO" && "ring-2 ring-primary")}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Inativos</p>
              <p className="text-2xl font-semibold text-muted-foreground">{totalInativos}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table className={HEADER_CLASSES}>
            <TableHeader>
              <TableRow>
                <SortableHead sp={sp} campo="codigo">
                  Código
                </SortableHead>
                <SortableHead sp={sp} campo="nome">
                  Nome
                </SortableHead>
                <TableHead className="text-center">
                  <MultiSelectFilter
                    paramName="status"
                    label="Status"
                    options={[
                      { value: "ATIVO", label: "Ativo" },
                      { value: "INATIVO", label: "Inativo" },
                    ]}
                  />
                </TableHead>
                <TableHead className="text-center">Ações</TableHead>
                <TableHead className="text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pdvs.map((pdv) => (
                <TableRow key={pdv.id}>
                  <TableCell className="text-center font-mono">
                    <Link href={`/cadastros/pdvs/${pdv.id}`} className="hover:underline">
                      {pdv.codigo}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">{pdv.nome}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={pdv.ativo ? "default" : "secondary"}>
                      {pdv.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/cadastros/pdvs/${pdv.id}?editar=1`}
                        title="Editar PDV"
                        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <ExcluirPdvDialog pdv={pdv} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <PdvAtivoToggle pdvId={pdv.id} ativo={pdv.ativo} />
                  </TableCell>
                </TableRow>
              ))}
              {pdvs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                    Nenhum PDV encontrado.
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

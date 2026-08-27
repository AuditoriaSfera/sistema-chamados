import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireGerenciarAdministradores } from "@/lib/session";
import { formatarDataHoraSegundos } from "@/lib/datas";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { cn } from "@/lib/utils";
import { acaoLabel, entidadeLabel, formatDetalhes, ENTIDADE_LABELS } from "@/lib/audit-format";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30";

const CAMPOS_PROPRIOS = ["de", "ate"];

function parseMulti(valor: string | undefined): string[] | undefined {
  const valores = valor?.split(",").filter(Boolean);
  return valores && valores.length > 0 ? valores : undefined;
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireGerenciarAdministradores();
  const sp = await searchParams;

  const where: {
    entidade?: { in: string[] };
    usuarioId?: { in: string[] };
    createdAt?: { gte?: Date; lte?: Date };
  } = {};
  const entidadeValues = parseMulti(sp.entidade);
  if (entidadeValues) where.entidade = { in: entidadeValues };
  const usuarioValues = parseMulti(sp.usuarioId);
  if (usuarioValues) where.usuarioId = { in: usuarioValues };
  if (sp.de || sp.ate) {
    where.createdAt = {
      ...(sp.de ? { gte: new Date(sp.de) } : {}),
      ...(sp.ate ? { lte: new Date(`${sp.ate}T23:59:59`) } : {}),
    };
  }

  const [logs, entidades, usuarios, pdvs, perfis, servicos, slaPresets, statuses] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { usuario: true },
    }),
    prisma.auditLog.findMany({ distinct: ["entidade"], select: { entidade: true } }),
    prisma.usuario.findMany({ orderBy: { nome: "asc" } }),
    prisma.pdv.findMany({ select: { id: true, nome: true } }),
    prisma.perfilAcesso.findMany({ select: { id: true, nome: true } }),
    prisma.servico.findMany({ select: { id: true, nome: true } }),
    prisma.slaPreset.findMany({ select: { id: true, nome: true } }),
    prisma.status.findMany({ select: { id: true, nome: true } }),
  ]);

  // Mapa id -> nome usado pra trocar cuids crus (em Entidade e Detalhes) por
  // referências legíveis, ex.: o id de um PDV pelo nome do PDV.
  const nomesPorId = new Map<string, string>();
  for (const lista of [usuarios, pdvs, perfis, servicos, slaPresets, statuses]) {
    for (const item of lista) nomesPorId.set(item.id, item.nome);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/configuracoes" className="text-sm text-muted-foreground hover:underline">
          ← Configurações
        </Link>
        <h1 className="text-xl font-semibold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Criação/alteração de cadastros e vínculos de acesso. {logs.length} registro(s).
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Entidade</label>
            <div className={cn(selectClass, "flex items-center")}>
              <MultiSelectFilter
                paramName="entidade"
                label="Todas"
                options={entidades.map((e) => ({
                  value: e.entidade,
                  label: ENTIDADE_LABELS[e.entidade] ?? e.entidade,
                }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Usuário</label>
            <div className={cn(selectClass, "flex items-center")}>
              <MultiSelectFilter
                paramName="usuarioId"
                label="Todos"
                options={usuarios.map((u) => ({ value: u.id, label: u.nome }))}
              />
            </div>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-3">
            {Object.entries(sp)
              .filter(([k, v]) => v && !CAMPOS_PROPRIOS.includes(k))
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">De</label>
              <input type="date" name="de" defaultValue={sp.de ?? ""} className={selectClass} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Até</label>
              <input type="date" name="ate" defaultValue={sp.ate ?? ""} className={selectClass} />
            </div>
            <button type="submit" className={selectClass}>
              Filtrar
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table className="[&_th]:h-7 [&_th]:bg-muted/50 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase">
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => {
                const referencia = nomesPorId.get(l.entidadeId);
                const detalhes = formatDetalhes(l.detalhes, nomesPorId);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="align-top text-xs text-muted-foreground whitespace-nowrap">
                      {formatarDataHoraSegundos(l.createdAt)}
                    </TableCell>
                    <TableCell className="align-top text-sm">{l.usuario.nome}</TableCell>
                    <TableCell className="align-top text-sm">
                      {entidadeLabel(l.entidade)}
                      {referencia && (
                        <span className="block text-xs text-muted-foreground">{referencia}</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-sm whitespace-nowrap">
                      {acaoLabel(l.acao)}
                    </TableCell>
                    <TableCell className="align-top text-xs text-muted-foreground">
                      {detalhes.length === 0 ? (
                        "—"
                      ) : (
                        <ul className="space-y-0.5">
                          {detalhes.map((d) => (
                            <li key={d.label}>
                              <span className="text-foreground/70">{d.label}:</span> {d.valor}
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                    Nenhum registro com esses filtros.
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

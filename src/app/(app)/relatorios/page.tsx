import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canViewReports } from "@/lib/permissions";
import { buildChamadoWhere } from "@/lib/tickets";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportCsvButton } from "@/components/export-csv-button";
import { ReportFilters } from "./report-filters";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { cn } from "@/lib/utils";
import { corBorderClasses, type ColorKey } from "@/lib/color-palette";
import { ColorIcon } from "@/components/color-icon";
import { SummaryCard } from "@/components/summary-card";
import Link from "next/link";
import {
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Store,
  Wrench,
  Users,
  Activity,
  TrendingUp,
  UserRound,
  Award,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  type LucideIcon,
} from "lucide-react";
import {
  type CalendarioPorPdv,
  type ChamadoReportRow,
  pdvsComMaisChamados,
  porPdv,
  produtividadePorOperador,
  produtividadePorPdv,
  rankingChamadosPorSolicitante,
  rankingReaberturaPorSolicitante,
  revendedoresComMaisChamados,
  servicosMaisRequisitados,
  slaStats,
  taxaReaberturaGeral,
  taxaReaberturaPorPdv,
  tempoMedioResolucaoGeral,
  volumePorDiaSemana,
} from "@/lib/reports";
import type { PdvCalendar } from "@/lib/business-calendar";
import { fmtHoras } from "@/lib/sla-format";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (!canViewReports(user)) redirect("/tickets");
  const sp = await searchParams;

  const where = buildChamadoWhere(user, sp);

  const [chamados, todosPdvs, servicos, usuarios, perfis] = await Promise.all([
    prisma.chamado.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        numero: true,
        status: true,
        slaPreset: { select: { id: true, nome: true, cor: true, critica: true } },
        subMotivoFinalizacao: true,
        createdAt: true,
        finalizadoEm: true,
        slaVencimentoEm: true,
        motivoReabertura: true,
        pdv: { select: { id: true, codigo: true, nome: true } },
        servico: { select: { nome: true } },
        pedido: { select: { numero: true, nomeCliente: true } },
        abertoPor: { select: { id: true, nome: true } },
        responsavel: { select: { id: true, nome: true } },
        mensagens: { select: { autorId: true, createdAt: true } },
      },
    }),
    prisma.pdv.findMany({ orderBy: { codigo: "asc" } }),
    prisma.servico.findMany({ orderBy: { nome: "asc" } }),
    prisma.usuario.findMany({ orderBy: { nome: "asc" } }),
    prisma.perfilAcesso.findMany(),
  ]);

  const rows = chamados as unknown as ChamadoReportRow[];

  const perfilMap = new Map(perfis.map((p) => [p.id, p]));
  const solicitantesFiltro = usuarios.filter((u) => perfilMap.get(u.perfil)?.podeAbrirChamado);
  const operadoresFiltro = usuarios.filter((u) => perfilMap.get(u.perfil)?.podeAlterarStatus);

  const pdvIdsComChamado = [...new Set(rows.map((c) => c.pdv.id))];
  const [horariosPorPdv, feriadosPorPdv] = pdvIdsComChamado.length
    ? await Promise.all([
        prisma.pdvHorario.findMany({ where: { pdvId: { in: pdvIdsComChamado } } }),
        prisma.feriado.findMany({ where: { pdvId: { in: pdvIdsComChamado } } }),
      ])
    : [[], []];
  const calendarioPorPdv: CalendarioPorPdv = new Map<string, PdvCalendar>(
    pdvIdsComChamado.map((pdvId) => [
      pdvId,
      {
        horarios: horariosPorPdv.filter((h) => h.pdvId === pdvId),
        feriados: feriadosPorPdv.filter((f) => f.pdvId === pdvId).map((f) => f.data),
      },
    ])
  );

  const sla = slaStats(rows);
  const tempoMedio = tempoMedioResolucaoGeral(rows, calendarioPorPdv);
  const taxaReabertura = taxaReaberturaGeral(rows);
  const pdvStats = porPdv(rows, calendarioPorPdv);
  const tiposServico = servicosMaisRequisitados(rows);
  const operadores = produtividadePorOperador(rows, calendarioPorPdv);
  const pdvsProdutividade = produtividadePorPdv(rows, calendarioPorPdv);
  const pdvsComVolume = pdvsComMaisChamados(rows, calendarioPorPdv);
  const revendedores = revendedoresComMaisChamados(rows);
  const rankingSolicitantes = rankingChamadosPorSolicitante(rows);
  const rankingReaberturaSolicitantes = rankingReaberturaPorSolicitante(rows);
  const reaberturaPorPdv = taxaReaberturaPorPdv(rows);
  const diaSemana = volumePorDiaSemana(rows);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} chamado(s) no período/escopo selecionado
        </p>
      </div>

      <ReportFilters
        pdvs={todosPdvs}
        servicos={servicos}
        solicitantes={solicitantesFiltro}
        operadores={operadoresFiltro}
        searchParams={sp}
      />

      <div className="grid grid-cols-5 gap-4">
        <SummaryCard label="Total de chamados" icon={Inbox} color="blue">
          <p className="text-2xl font-semibold">{sla.total}</p>
        </SummaryCard>
        <SummaryCard label="SLA cumprido" icon={CheckCircle2} color="emerald">
          <p className="text-2xl font-semibold text-emerald-600">{sla.cumpridoPct}%</p>
        </SummaryCard>
        <SummaryCard label="SLA vencido" icon={AlertTriangle} color="red">
          <p className="text-2xl font-semibold text-destructive">{sla.vencidoPct}%</p>
        </SummaryCard>
        <SummaryCard label="Tempo médio de resolução" icon={Clock} color="cyan">
          <div className="flex items-end gap-4">
            <div>
              <p className="text-2xl font-semibold">{fmtHoras(tempoMedio?.totalHoras ?? null)}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Corrido
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-cyan-600 dark:text-cyan-400">
                {fmtHoras(tempoMedio?.utilHoras ?? null)}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Útil
              </p>
            </div>
          </div>
        </SummaryCard>
        <SummaryCard label="Taxa de reabertura" icon={RotateCcw} color="amber">
          <p className="text-2xl font-semibold">{taxaReabertura}%</p>
        </SummaryCard>
      </div>

      <ReportCard
        title="Chamados por PDV"
        icon={Store}
        color="violet"
        headers={[
          "PDV",
          "Total",
          "SLA cumprido",
          "SLA vencido",
          "Tempo médio resolução (corrido)",
          "Tempo médio resolução (útil)",
        ]}
        rows={pdvStats.map((v) => [
          v.pdvCodigo,
          v.total,
          `${v.cumpridoPct}%`,
          `${v.vencidoPct}%`,
          fmtHoras(v.tempoMedioResolucao?.totalHoras ?? null),
          fmtHoras(v.tempoMedioResolucao?.utilHoras ?? null),
        ])}
        csvFilename="chamados-por-pdv"
        sp={sp}
      />

      <ReportCard
        title="Tipo de serviço mais requisitado"
        icon={Wrench}
        color="blue"
        headers={["Serviço", ...tiposServico.pdvCodigos, "Total"]}
        rows={tiposServico.rows.map((s) => [
          s.servico,
          ...tiposServico.pdvCodigos.map((pdvCodigo) => s.porPdv[pdvCodigo] ?? 0),
          s.total,
        ])}
        csvFilename="servicos-mais-requisitados"
        sp={sp}
      />

      <ReportCard
        title="Produtividade por operador"
        icon={Users}
        color="cyan"
        headers={[
          "Operador",
          "Atribuídos",
          "Finalizados",
          "1ª resposta (corrido)",
          "1ª resposta (útil)",
          "Resolução (corrido)",
          "Resolução (útil)",
        ]}
        rows={operadores.map((o) => [
          o.operador,
          o.totalAtribuidos,
          o.finalizados,
          fmtHoras(o.tempoMedioPrimeiraResposta?.totalHoras ?? null),
          fmtHoras(o.tempoMedioPrimeiraResposta?.utilHoras ?? null),
          fmtHoras(o.tempoMedioResolucao?.totalHoras ?? null),
          fmtHoras(o.tempoMedioResolucao?.utilHoras ?? null),
        ])}
        csvFilename="produtividade-por-operador"
        sp={sp}
      />

      <ReportCard
        title="Produtividade por PDV"
        icon={Activity}
        color="violet"
        headers={[
          "PDV",
          "Atribuídos",
          "Finalizados",
          "1ª resposta (corrido)",
          "1ª resposta (útil)",
          "Resolução (corrido)",
          "Resolução (útil)",
        ]}
        rows={pdvsProdutividade.map((p) => [
          p.pdvCodigo,
          p.totalAtribuidos,
          p.finalizados,
          fmtHoras(p.tempoMedioPrimeiraResposta?.totalHoras ?? null),
          fmtHoras(p.tempoMedioPrimeiraResposta?.utilHoras ?? null),
          fmtHoras(p.tempoMedioResolucao?.totalHoras ?? null),
          fmtHoras(p.tempoMedioResolucao?.utilHoras ?? null),
        ])}
        csvFilename="produtividade-por-pdv"
        sp={sp}
      />

      <div className="grid grid-cols-2 gap-6">
        <ReportCard
          title="PDVs com mais chamados"
          icon={TrendingUp}
          color="orange"
          headers={["PDV", "Total", "Tempo médio em aberto (corrido)", "Tempo médio em aberto (útil)"]}
          rows={pdvsComVolume.map((p) => [
            `${p.pdvCodigo} — ${p.pdvNome}`,
            p.total,
            fmtHoras(p.tempoMedioAberto?.totalHoras ?? null),
            fmtHoras(p.tempoMedioAberto?.utilHoras ?? null),
          ])}
          csvFilename="pdvs-mais-chamados"
          sp={sp}
        />
        <ReportCard
          title="Revendedores com mais chamados (reincidência)"
          icon={UserRound}
          color="pink"
          headers={["Revendedor", "Total", "Reincidente"]}
          rows={revendedores.map((r) => [r.cliente, r.total, r.reincidente ? "Sim" : "Não"])}
          csvFilename="revendedores-reincidencia"
          sp={sp}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ReportCard
          title="Ranking de chamados por solicitante"
          icon={Award}
          color="amber"
          headers={["Solicitante", "Total"]}
          rows={rankingSolicitantes.map((r) => [r.solicitante, r.total])}
          csvFilename="ranking-chamados-por-solicitante"
          sp={sp}
        />
        <ReportCard
          title="Ranking de reabertura por solicitante"
          icon={RotateCcw}
          color="amber"
          headers={["Solicitante", "Total", "Reabertos", "Taxa"]}
          rows={rankingReaberturaSolicitantes.map((r) => [
            r.solicitante,
            r.total,
            r.reabertos,
            `${r.taxaPct}%`,
          ])}
          csvFilename="ranking-reabertura-por-solicitante"
          sp={sp}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ReportCard
          title="Taxa de reabertura por PDV"
          icon={RotateCcw}
          color="violet"
          headers={["PDV", "Total", "Reabertos", "Taxa"]}
          rows={reaberturaPorPdv.map((r) => [r.pdvCodigo, r.total, r.reabertos, `${r.taxaPct}%`])}
          csvFilename="taxa-reabertura-por-pdv"
          sp={sp}
        />
        <ReportCard
          title="Volume por dia da semana"
          icon={CalendarDays}
          color="slate"
          headers={["Dia", "Total"]}
          rows={diaSemana.map((d) => [d.dia, d.total])}
          csvFilename="volume-por-dia-semana"
          sp={sp}
        />
      </div>
    </div>
  );
}

function parseMulti(valor: string | undefined): string[] | undefined {
  const valores = valor?.split(",").filter(Boolean);
  return valores && valores.length > 0 ? valores : undefined;
}

/** Link de ordenação escopado por relatório (cada tabela tem sua própria chave de sort/dir na URL). */
function reportSortHref(
  sp: Record<string, string | undefined>,
  sortKey: string,
  dirKey: string,
  colIndex: number
) {
  const ativo = sp[sortKey] === String(colIndex);
  const novaDirecao = ativo && sp[dirKey] === "asc" ? "desc" : "asc";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== sortKey && k !== dirKey) params.set(k, v);
  }
  params.set(sortKey, String(colIndex));
  params.set(dirKey, novaDirecao);
  return `/relatorios?${params.toString()}`;
}

function ReportCard({
  title,
  icon,
  color,
  headers,
  rows,
  csvFilename,
  sp,
}: {
  title: string;
  icon: LucideIcon;
  color: ColorKey;
  headers: string[];
  rows: (string | number | null)[][];
  csvFilename: string;
  sp: Record<string, string | undefined>;
}) {
  const filterKey = `${csvFilename}_f`;
  const sortKey = `${csvFilename}_sort`;
  const dirKey = `${csvFilename}_dir`;

  const filtroOptions = Array.from(new Set(rows.map((r) => String(r[0] ?? ""))))
    .filter(Boolean)
    .sort()
    .map((v) => ({ value: v, label: v }));

  const filtroSelecionado = parseMulti(sp[filterKey]);
  const filteredRows = filtroSelecionado
    ? rows.filter((r) => filtroSelecionado.includes(String(r[0] ?? "")))
    : rows;

  const sortCol = sp[sortKey] !== undefined ? Number(sp[sortKey]) : NaN;
  const dir = sp[dirKey] === "asc" ? 1 : -1;
  const displayRows =
    !Number.isNaN(sortCol) && sortCol >= 0 && sortCol < headers.length
      ? [...filteredRows].sort((a, b) => {
          const av = a[sortCol];
          const bv = b[sortCol];
          if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
          return String(av ?? "").localeCompare(String(bv ?? ""), "pt-BR") * dir;
        })
      : filteredRows;

  return (
    <Card className={cn("border-l-4", corBorderClasses(color))}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ColorIcon icon={icon} color={color} />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          {filtroOptions.length > 1 && (
            <MultiSelectFilter paramName={filterKey} label={headers[0]} options={filtroOptions} />
          )}
          <ExportCsvButton filename={csvFilename} headers={headers} rows={displayRows} />
        </div>
      </CardHeader>
      <CardContent>
        <Table className="[&_th]:h-7 [&_th]:bg-muted/50 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase">
          <TableHeader>
            <TableRow>
              {headers.map((h, j) => {
                const ativo = sp[sortKey] === String(j);
                const Icone = ativo ? (sp[dirKey] === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <TableHead key={h}>
                    <Link
                      href={reportSortHref(sp, sortKey, dirKey, j)}
                      scroll={false}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-foreground",
                        ativo && "text-primary"
                      )}
                    >
                      {h}
                      <Icone className="size-3" />
                    </Link>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => (
                  <TableCell key={j} className="text-sm">
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {displayRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={headers.length} className="text-center text-sm text-muted-foreground py-6">
                  Sem dados no período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

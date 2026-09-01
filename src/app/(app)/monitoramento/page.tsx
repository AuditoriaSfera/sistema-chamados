import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { buildChamadoWhere, SEM_RESPONSAVEL_VALUE } from "@/lib/tickets";
import { getVisiblePdvIds } from "@/lib/permissions";
import { DateRangeFilter } from "@/components/date-range-filter";
import {
  type CalendarioPorPdv,
  type ChamadoReportRow,
  classificarSla,
  porPdv,
  rankingChamadosPorSolicitante,
  revendedoresComMaisChamados,
  taxaReaberturaPorPdv,
} from "@/lib/reports";
import { STATUS_FINAIS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoRefresh } from "@/components/auto-refresh";
import { SummaryCard } from "@/components/summary-card";
import { HorizontalBar } from "@/components/horizontal-bar";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { corDotClasses, type ColorKey } from "@/lib/color-palette";
import { fmtHoras } from "@/lib/sla-format";
import type { PdvCalendar } from "@/lib/business-calendar";
import { cn } from "@/lib/utils";
import {
  CalendarPlus,
  Clock,
  AlertTriangle,
  Flame,
  UserX,
  Store,
  Users,
  UserRound,
  PieChart,
  RotateCcw,
  Gauge,
  Timer,
  Layers,
  Award,
  Wrench,
} from "lucide-react";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function SlaDot({ cor }: { cor: "verde" | "amarelo" | "vermelho" }) {
  const classes = {
    verde: "bg-emerald-500",
    amarelo: "bg-amber-500",
    vermelho: "bg-destructive",
  };
  return <span className={`inline-block size-2.5 rounded-full ${classes[cor]}`} />;
}

function parseMulti(valor: string | undefined): string[] | undefined {
  const valores = valor?.split(",").filter(Boolean);
  return valores && valores.length > 0 ? valores : undefined;
}

export default async function MonitoramentoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const where = buildChamadoWhere(user, sp);

  const [chamados, todosPdvs, slaCritico, statusesAtivos, usuarios, perfis] = await Promise.all([
    prisma.chamado.findMany({
      where,
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
    prisma.slaPreset.findFirst({ where: { critica: true } }),
    prisma.status.findMany({ where: { ativo: true }, orderBy: { ordem: "asc" } }),
    prisma.usuario.findMany({ orderBy: { nome: "asc" } }),
    prisma.perfilAcesso.findMany(),
  ]);

  const rows = chamados as unknown as ChamadoReportRow[];

  const visiblePdvIds = getVisiblePdvIds(user);
  const pdvsNoEscopo =
    visiblePdvIds === null ? todosPdvs : todosPdvs.filter((pdv) => visiblePdvIds.includes(pdv.id));

  const perfilMap = new Map(perfis.map((p) => [p.id, p]));
  const solicitantes = usuarios.filter((u) => perfilMap.get(u.perfil)?.podeAbrirChamado);
  const operadores = usuarios.filter((u) => perfilMap.get(u.perfil)?.podeAlterarStatus);

  const ativos = rows.filter((c) => !STATUS_FINAIS.includes(c.status));
  const hoje = hojeISO();
  const abertosHoje = rows.filter((c) => c.createdAt.toISOString().slice(0, 10) === hoje).length;
  const pendentes = ativos.length;
  const vencidos = ativos.filter((c) => classificarSla(c) === "vencido").length;
  const proximosVencimento = ativos.filter((c) => classificarSla(c) === "risco").length;
  const criticos = ativos.filter((c) => c.slaPreset.critica).length;
  const semResponsavel = ativos.filter((c) => !c.responsavel).length;

  const pdvStats = pdvsNoEscopo.map((pdv) => {
    const doPdv = rows.filter((c) => c.pdv.id === pdv.id);
    const ativosDoPdv = doPdv.filter((c) => !STATUS_FINAIS.includes(c.status));
    const vencidosPdv = ativosDoPdv.filter((c) => classificarSla(c) === "vencido").length;
    const riscoPdv = ativosDoPdv.filter((c) => classificarSla(c) === "risco").length;
    const cor = vencidosPdv > 0 ? "vermelho" : riscoPdv > 0 ? "amarelo" : "verde";
    const porStatus = statusesAtivos
      .map((status) => ({ status, total: doPdv.filter((c) => c.status === status.id).length }))
      .filter((s) => s.total > 0);
    return {
      pdv,
      total: doPdv.length,
      vencidos: vencidosPdv,
      cor: cor as "verde" | "amarelo" | "vermelho",
      porStatus,
    };
  }).sort((a, b) => b.total - a.total);

  const pdvIdsFiltroStatus = parseMulti(sp.statusPdv);
  const chamadosParaStatus = pdvIdsFiltroStatus
    ? rows.filter((c) => pdvIdsFiltroStatus.includes(c.pdv.id))
    : rows;
  const statusDist = statusesAtivos
    .map((s) => ({ status: s, total: chamadosParaStatus.filter((c) => c.status === s.id).length }))
    .filter((s) => s.total > 0);

  function filtrarPorPdv(paramName: string) {
    const ids = parseMulti(sp[paramName]);
    return ids ? rows.filter((c) => ids.includes(c.pdv.id)) : rows;
  }

  const pdvIdsFiltroVisao = parseMulti(sp.visaoPdv);
  const pdvStatsFiltrado = pdvIdsFiltroVisao
    ? pdvStats.filter((v) => pdvIdsFiltroVisao.includes(v.pdv.id))
    : pdvStats;
  const maxPdvStatsTotal = Math.max(1, ...pdvStatsFiltrado.map((v) => v.total));
  const somaPdvStatsTotal = pdvStatsFiltrado.reduce((acc, v) => acc + v.total, 0);

  const rowsParaRankingPdv = filtrarPorPdv("rankingPdvF");
  const rankingPdv = porPdv(rowsParaRankingPdv, new Map()).slice(0, 5);
  const maxRankingPdv = Math.max(1, ...rankingPdv.map((v) => v.total));

  const rowsParaRevendedor = filtrarPorPdv("revendedorPdv");
  const rankingClientes = revendedoresComMaisChamados(rowsParaRevendedor, 5);
  const maxRankingClientes = Math.max(1, ...rankingClientes.map((c) => c.total));

  const rowsParaSolicitante = filtrarPorPdv("solicitantePdv");
  const rankingSolicitantes = rankingChamadosPorSolicitante(rowsParaSolicitante, 5);
  const maxRankingSolicitantes = Math.max(1, ...rankingSolicitantes.map((s) => s.total));

  const rowsParaServico = filtrarPorPdv("servicoPdv");
  const servicosMap = new Map<string, number>();
  for (const c of rowsParaServico) {
    servicosMap.set(c.servico.nome, (servicosMap.get(c.servico.nome) ?? 0) + 1);
  }
  const rankingServicos = Array.from(servicosMap.entries())
    .map(([servico, total]) => ({ servico, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const maxRankingServicos = Math.max(1, ...rankingServicos.map((s) => s.total));

  const rowsParaOperador = filtrarPorPdv("operadorPdv");
  const atendidosPorOperadorMap = new Map<string, number>();
  for (const c of rowsParaOperador) {
    if (!c.responsavel) continue;
    atendidosPorOperadorMap.set(c.responsavel.nome, (atendidosPorOperadorMap.get(c.responsavel.nome) ?? 0) + 1);
  }
  const atendidosPorOperador = Array.from(atendidosPorOperadorMap.entries())
    .map(([operador, total]) => ({ operador, total }))
    .sort((a, b) => b.total - a.total);
  const maxAtendidos = Math.max(1, ...atendidosPorOperador.map((o) => o.total));

  const rowsParaReabertura = filtrarPorPdv("reaberturaPdv");
  const reaberturaPorPdv = [...taxaReaberturaPorPdv(rowsParaReabertura)]
    .sort((a, b) => b.taxaPct - a.taxaPct)
    .slice(0, 5);

  const pdvIdsFiltroSla = parseMulti(sp.slaPdv);
  const rowsParaSla = pdvIdsFiltroSla
    ? rows.filter((c) => pdvIdsFiltroSla.includes(c.pdv.id))
    : rows;
  const slaPorPdvMap = new Map<string, { pdvCodigo: string; noPrazo: number; foraPrazo: number }>();
  for (const c of rowsParaSla) {
    if (!c.slaVencimentoEm || c.status === "CANCELADO") continue;
    const vencido = STATUS_FINAIS.includes(c.status)
      ? !(c.finalizadoEm && c.finalizadoEm <= c.slaVencimentoEm)
      : classificarSla(c) === "vencido";
    const entry = slaPorPdvMap.get(c.pdv.id) ?? {
      pdvCodigo: c.pdv.codigo,
      noPrazo: 0,
      foraPrazo: 0,
    };
    if (vencido) entry.foraPrazo++;
    else entry.noPrazo++;
    slaPorPdvMap.set(c.pdv.id, entry);
  }
  const slaPorPdv = Array.from(slaPorPdvMap.values())
    .map((e) => ({ ...e, total: e.noPrazo + e.foraPrazo }))
    .sort((a, b) => b.total - a.total);

  const rowsParaSlaPreset = filtrarPorPdv("slaPresetPdv");
  const slaPresetDistMap = new Map<string, { nome: string; cor: string; total: number }>();
  for (const c of rowsParaSlaPreset) {
    const entry = slaPresetDistMap.get(c.slaPreset.id) ?? {
      nome: c.slaPreset.nome,
      cor: c.slaPreset.cor,
      total: 0,
    };
    entry.total++;
    slaPresetDistMap.set(c.slaPreset.id, entry);
  }
  const slaPresetDist = Array.from(slaPresetDistMap.values()).sort((a, b) => b.total - a.total);

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
  const rowsParaTempoResolucao = filtrarPorPdv("tempoResPdv");
  const tempoResolucaoPorPdv = porPdv(rowsParaTempoResolucao, calendarioPorPdv)
    .filter((v) => v.tempoMedioResolucao !== null)
    .slice(0, 5);
  const maxTempoResolucao = Math.max(
    1,
    ...tempoResolucaoPorPdv.map((v) => v.tempoMedioResolucao!.totalHoras)
  );

  const cards = [
    {
      label: "Abertos hoje",
      valor: abertosHoje,
      href: `/tickets?de=${hoje}&ate=${hoje}`,
      icon: CalendarPlus,
      color: "blue" as ColorKey,
    },
    {
      label: "Pendentes",
      valor: pendentes,
      href: "/tickets?pendente=1",
      icon: Clock,
      color: "cyan" as ColorKey,
    },
    {
      label: "Vencidos no SLA",
      valor: vencidos,
      href: "/tickets?slaVencido=1",
      destaque: true,
      icon: AlertTriangle,
      color: "red" as ColorKey,
    },
    {
      label: "Próximo do vencimento",
      valor: proximosVencimento,
      href: "/tickets?pendente=1",
      icon: Timer,
      color: "amber" as ColorKey,
    },
    {
      label: "Críticos",
      valor: criticos,
      href: slaCritico ? `/tickets?sla=${slaCritico.id}&pendente=1` : "/tickets?pendente=1",
      icon: Flame,
      color: "orange" as ColorKey,
    },
    {
      label: "Sem responsável",
      valor: semResponsavel,
      href: "/tickets?semResponsavel=1",
      icon: UserX,
      color: "slate" as ColorKey,
    },
  ];

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={15000} />
      <div>
        <h1 className="text-xl font-semibold">Monitoramento</h1>
        <p className="text-sm text-muted-foreground">Estado atual dos chamados no seu escopo</p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">PDV</label>
              <div className="flex h-9 items-center rounded-md border border-input px-3">
                <MultiSelectFilter
                  paramName="pdvId"
                  label="Todos"
                  options={pdvsNoEscopo.map((pdv) => ({ value: pdv.id, label: pdv.codigo }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Solicitante</label>
              <div className="flex h-9 items-center rounded-md border border-input px-3">
                <MultiSelectFilter
                  paramName="solicitanteId"
                  label="Todos"
                  options={solicitantes.map((u) => ({ value: u.id, label: u.nome }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Responsável</label>
              <div className="flex h-9 items-center rounded-md border border-input px-3">
                <MultiSelectFilter
                  paramName="operadorId"
                  label="Todos"
                  options={[
                    { value: SEM_RESPONSAVEL_VALUE, label: "Sem responsável" },
                    ...operadores.map((u) => ({ value: u.id, label: u.nome })),
                  ]}
                />
              </div>
            </div>
          </div>
          <DateRangeFilter basePath="/monitoramento" sp={sp} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-6 gap-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <SummaryCard label={c.label} icon={c.icon} color={c.color}>
              <p className={`text-2xl font-semibold ${c.destaque && c.valor > 0 ? "text-destructive" : ""}`}>
                {c.valor}
              </p>
            </SummaryCard>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <Store className="size-4" />
              </span>
              <CardTitle className="text-base">Visão por PDV</CardTitle>
            </div>
            <MultiSelectFilter
              paramName="visaoPdv"
              label="PDV"
              options={pdvsNoEscopo.map((pdv) => ({ value: pdv.id, label: pdv.codigo }))}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {pdvStatsFiltrado.map((v) => (
              <div key={v.pdv.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <Link href={`/tickets?pdvId=${v.pdv.id}`} className="flex items-center gap-1.5 hover:underline">
                    <SlaDot cor={v.cor} />
                    {v.pdv.codigo}
                  </Link>
                  <span className="text-muted-foreground">
                    {v.total} chamado(s){v.vencidos > 0 && ` · ${v.vencidos} vencido(s)`}
                    {" · "}
                    {somaPdvStatsTotal > 0 ? Math.round((v.total / somaPdvStatsTotal) * 100) : 0}%
                  </span>
                </div>
                {v.total > 0 ? (
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="flex h-full overflow-hidden rounded-full"
                      style={{ width: `${(v.total / maxPdvStatsTotal) * 100}%` }}
                    >
                      {v.porStatus.map(({ status, total }) => (
                        <div
                          key={status.id}
                          className={cn(corDotClasses(status.cor), "h-full")}
                          style={{ width: `${(total / v.total) * 100}%` }}
                          title={`${status.nome}: ${total}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-2.5 w-full rounded-full bg-muted" />
                )}
              </div>
            ))}
            {pdvStatsFiltrado.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum PDV no seu escopo.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <PieChart className="size-4" />
              </span>
              <CardTitle className="text-base">Distribuição por status</CardTitle>
            </div>
            <MultiSelectFilter
              paramName="statusPdv"
              label="PDV"
              options={pdvsNoEscopo.map((pdv) => ({ value: pdv.id, label: pdv.codigo }))}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {statusDist.length > 0 ? (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                  {statusDist.map(({ status, total }) => (
                    <div
                      key={status.id}
                      className={cn(corDotClasses(status.cor), "h-full")}
                      style={{ width: `${(total / chamadosParaStatus.length) * 100}%` }}
                      title={`${status.nome}: ${total}`}
                    />
                  ))}
                </div>
                <ul className="space-y-1.5 text-sm">
                  {statusDist.map(({ status, total }) => (
                    <li key={status.id} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("inline-block size-2.5 rounded-full", corDotClasses(status.cor))} />
                        {status.nome}
                      </span>
                      <span className="text-muted-foreground">{total}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum chamado no período/escopo.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <Store className="size-4" />
              </span>
              <CardTitle className="text-base">Ranking de PDVs</CardTitle>
            </div>
            <MultiSelectFilter
              paramName="rankingPdvF"
              label="PDV"
              options={pdvsNoEscopo.map((pdv) => ({ value: pdv.id, label: pdv.codigo }))}
            />
          </CardHeader>
          <CardContent className="space-y-2.5">
            {rankingPdv.map((v) => (
              <div key={v.pdvCodigo} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{v.pdvCodigo}</span>
                  <span className="text-muted-foreground">{v.total}</span>
                </div>
                <HorizontalBar value={v.total} max={maxRankingPdv} color="violet" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-pink-500/15 text-pink-600 dark:text-pink-400">
                <UserRound className="size-4" />
              </span>
              <CardTitle className="text-base">Ranking de revendedores</CardTitle>
            </div>
            <MultiSelectFilter
              paramName="revendedorPdv"
              label="PDV"
              options={pdvsNoEscopo.map((pdv) => ({ value: pdv.id, label: pdv.codigo }))}
            />
          </CardHeader>
          <CardContent className="space-y-2.5">
            {rankingClientes.map((c) => (
              <div key={c.cliente} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{c.cliente}</span>
                  <span className="text-muted-foreground">{c.total}</span>
                </div>
                <HorizontalBar value={c.total} max={maxRankingClientes} color="pink" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                <Users className="size-4" />
              </span>
              <CardTitle className="text-base">Chamados por operador</CardTitle>
            </div>
            <MultiSelectFilter
              paramName="operadorPdv"
              label="PDV"
              options={pdvsNoEscopo.map((pdv) => ({ value: pdv.id, label: pdv.codigo }))}
            />
          </CardHeader>
          <CardContent className="space-y-2.5">
            {atendidosPorOperador.map((o) => (
              <div key={o.operador} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{o.operador}</span>
                  <span className="text-muted-foreground">{o.total}</span>
                </div>
                <HorizontalBar value={o.total} max={maxAtendidos} color="cyan" />
              </div>
            ))}
            {atendidosPorOperador.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum chamado atribuído a um operador.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Award className="size-4" />
              </span>
              <CardTitle className="text-base">Ranking de solicitantes</CardTitle>
            </div>
            <MultiSelectFilter
              paramName="solicitantePdv"
              label="PDV"
              options={pdvsNoEscopo.map((pdv) => ({ value: pdv.id, label: pdv.codigo }))}
            />
          </CardHeader>
          <CardContent className="space-y-2.5">
            {rankingSolicitantes.map((s) => (
              <div key={s.solicitante} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{s.solicitante}</span>
                  <span className="text-muted-foreground">{s.total}</span>
                </div>
                <HorizontalBar value={s.total} max={maxRankingSolicitantes} color="amber" />
              </div>
            ))}
            {rankingSolicitantes.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum chamado no período/escopo.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <Wrench className="size-4" />
              </span>
              <CardTitle className="text-base">Ranking de serviços</CardTitle>
            </div>
            <MultiSelectFilter
              paramName="servicoPdv"
              label="PDV"
              options={pdvsNoEscopo.map((pdv) => ({ value: pdv.id, label: pdv.codigo }))}
            />
          </CardHeader>
          <CardContent className="space-y-2.5">
            {rankingServicos.map((s) => (
              <div key={s.servico} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{s.servico}</span>
                  <span className="text-muted-foreground">{s.total}</span>
                </div>
                <HorizontalBar value={s.total} max={maxRankingServicos} color="blue" />
              </div>
            ))}
            {rankingServicos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum chamado no período/escopo.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <RotateCcw className="size-4" />
              </span>
              <CardTitle className="text-base">Taxa de reabertura por PDV</CardTitle>
            </div>
            <MultiSelectFilter
              paramName="reaberturaPdv"
              label="PDV"
              options={pdvsNoEscopo.map((pdv) => ({ value: pdv.id, label: pdv.codigo }))}
            />
          </CardHeader>
          <CardContent className="space-y-2.5">
            {reaberturaPorPdv.map((r) => (
              <div key={r.pdvCodigo} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{r.pdvCodigo}</span>
                  <span className="text-muted-foreground">
                    {r.reabertos}/{r.total} ({r.taxaPct}%)
                  </span>
                </div>
                <HorizontalBar value={r.taxaPct} max={100} color="amber" />
              </div>
            ))}
            {reaberturaPorPdv.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum chamado no período/escopo.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Gauge className="size-4" />
              </span>
              <CardTitle className="text-base">SLA por PDV: no prazo x fora do prazo</CardTitle>
            </div>
            <MultiSelectFilter
              paramName="slaPdv"
              label="PDV"
              options={pdvsNoEscopo.map((pdv) => ({ value: pdv.id, label: pdv.codigo }))}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-emerald-500" />
                No prazo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-red-500" />
                Fora do prazo
              </span>
            </div>
            {slaPorPdv.length > 0 ? (
              slaPorPdv.map((p) => (
                <div key={p.pdvCodigo} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span>{p.pdvCodigo}</span>
                    <span className="text-muted-foreground">
                      {p.noPrazo} ({Math.round((p.noPrazo / p.total) * 100)}%) no prazo ·{" "}
                      {p.foraPrazo} ({Math.round((p.foraPrazo / p.total) * 100)}%) fora do prazo ·{" "}
                      {p.total} total
                    </span>
                  </div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(p.noPrazo / p.total) * 100}%` }}
                    />
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${(p.foraPrazo / p.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum chamado com SLA no período/escopo.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Layers className="size-4" />
            </span>
            <CardTitle className="text-base">Quantidade de chamados por SLA</CardTitle>
          </div>
          <MultiSelectFilter
            paramName="slaPresetPdv"
            label="PDV"
            options={pdvsNoEscopo.map((pdv) => ({ value: pdv.id, label: pdv.codigo }))}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {slaPresetDist.length > 0 ? (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {slaPresetDist.map((s) => (
                  <div
                    key={s.nome}
                    className={cn(corDotClasses(s.cor), "h-full")}
                    style={{ width: `${(s.total / rowsParaSlaPreset.length) * 100}%` }}
                    title={`${s.nome}: ${s.total}`}
                  />
                ))}
              </div>
              <ul className="space-y-1.5 text-sm">
                {slaPresetDist.map((s) => (
                  <li key={s.nome} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className={cn("inline-block size-2.5 rounded-full", corDotClasses(s.cor))} />
                      {s.nome}
                    </span>
                    <span className="text-muted-foreground">
                      {s.total} ({Math.round((s.total / rowsParaSlaPreset.length) * 100)}%)
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum chamado no período/escopo.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
              <Clock className="size-4" />
            </span>
            <CardTitle className="text-base">Tempo médio de resolução por PDV</CardTitle>
          </div>
          <MultiSelectFilter
            paramName="tempoResPdv"
            label="PDV"
            options={pdvsNoEscopo.map((pdv) => ({ value: pdv.id, label: pdv.codigo }))}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-slate-400" />
              Corrido
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-cyan-500" />
              Útil
            </span>
          </div>
          {tempoResolucaoPorPdv.map((v) => (
            <div key={v.pdvCodigo} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>{v.pdvCodigo}</span>
                <span className="text-muted-foreground">
                  {fmtHoras(v.tempoMedioResolucao!.totalHoras)} corrido / {fmtHoras(v.tempoMedioResolucao!.utilHoras)} útil
                </span>
              </div>
              <div className="space-y-1">
                <HorizontalBar value={v.tempoMedioResolucao!.totalHoras} max={maxTempoResolucao} color="slate" />
                <HorizontalBar value={v.tempoMedioResolucao!.utilHoras} max={maxTempoResolucao} color="cyan" />
              </div>
            </div>
          ))}
          {tempoResolucaoPorPdv.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum chamado finalizado no escopo pra calcular tempo de resolução.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

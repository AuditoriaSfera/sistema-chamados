import Link from "next/link";
import { MessageCircle, ArrowUp, ArrowDown, ArrowUpDown, ExternalLink, UserCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  buildChamadoOrderBy,
  buildChamadoWhere,
  classificarAlertaVencimento,
  formatarNumeroChamado,
  tempoConclusaoChamado,
  SEM_RESPONSAVEL_VALUE,
} from "@/lib/tickets";
import type { PdvCalendar } from "@/lib/business-calendar";
import { formatarDataHora } from "@/lib/datas";
import { canOpenTicket, canChangeStatus } from "@/lib/permissions";
import { AssumirIconButton } from "./assumir-icon-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SlaBadge, StatusBadge, statusDotClasses } from "@/lib/ticket-badges";
import { corBadgeClasses, corDotClasses } from "@/lib/color-palette";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { StickyHorizontalScrollbar } from "@/components/sticky-horizontal-scrollbar";
import { TicketFilters } from "./ticket-filters";
import { ClearNovoParam } from "./clear-novo-param";
import { AutoRefresh } from "@/components/auto-refresh";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 100;

function fmtHoras(h: number) {
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

const fmtDataHora = formatarDataHora;

function pageHref(sp: Record<string, string | undefined>, pagina: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "page") params.set(k, v);
  }
  if (pagina > 1) params.set("page", String(pagina));
  const query = params.toString();
  return query ? `/tickets?${query}` : "/tickets";
}

function statusCardHref(sp: Record<string, string | undefined>, status: string) {
  const ativo = sp.status === status;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "status" && k !== "page") params.set(k, v);
  }
  if (!ativo) params.set("status", status);
  const query = params.toString();
  return query ? `/tickets?${query}` : "/tickets";
}

function sortHref(sp: Record<string, string | undefined>, campo: string) {
  const ativo = sp.sort === campo;
  const novaDirecao = ativo && sp.dir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "sort" && k !== "dir") params.set(k, v);
  }
  params.set("sort", campo);
  params.set("dir", novaDirecao);
  return `/tickets?${params.toString()}`;
}

function SortToggle({ sp, campo }: { sp: Record<string, string | undefined>; campo: string }) {
  const ativo = sp.sort === campo;
  const Icone = ativo ? (sp.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <Link
      href={sortHref(sp, campo)}
      scroll={false}
      className={cn(
        "inline-flex items-center text-muted-foreground hover:text-foreground",
        ativo && "text-primary"
      )}
      aria-label="Ordenar"
    >
      <Icone className="size-3.5" />
    </Link>
  );
}

function SortableHead({
  sp,
  campo,
  children,
}: {
  sp: Record<string, string | undefined>;
  campo: string;
  children: React.ReactNode;
}) {
  const ativo = sp.sort === campo;
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
        {ativo && <span className="text-xs">{sp.dir === "asc" ? "▲" : "▼"}</span>}
      </Link>
    </TableHead>
  );
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const where = buildChamadoWhere(user, sp);
  const orderBy = buildChamadoOrderBy(sp);
  const paginaAtual = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // Contagem por status ignora o filtro de status atual, pra os cards sempre
  // mostrarem a distribuição completa (respeitando os demais filtros ativos).
  const whereSemStatus = buildChamadoWhere(user, { ...sp, status: undefined });

  const [total, chamados, pdvs, servicos, usuarios, statusCounts, slaPresets, statuses, perfis, config] =
    await Promise.all([
      prisma.chamado.count({ where }),
      prisma.chamado.findMany({
        where,
        orderBy,
        skip: (paginaAtual - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          pedido: true,
          pdv: true,
          servico: true,
          slaPreset: true,
          abertoPor: true,
          responsavel: true,
        },
      }),
      prisma.pdv.findMany({ orderBy: { codigo: "asc" } }),
      prisma.servico.findMany({ orderBy: { nome: "asc" } }),
      prisma.usuario.findMany({ orderBy: { nome: "asc" } }),
      prisma.chamado.groupBy({ by: ["status"], where: whereSemStatus, _count: { _all: true } }),
      prisma.slaPreset.findMany({ orderBy: { ordem: "asc" } }),
      prisma.status.findMany({ orderBy: { ordem: "asc" } }),
      prisma.perfilAcesso.findMany(),
      prisma.configGeral.upsert({ where: { id: "geral" }, update: {}, create: { id: "geral" } }),
    ]);

  const contagemPorStatus = new Map(statusCounts.map((s) => [s.status, s._count._all]));
  const statusMap = new Map(statuses.map((s) => [s.id, s]));
  const statusInfo = (chave: string) => statusMap.get(chave) ?? { nome: chave, cor: "slate" };
  const statusesAtivos = statuses.filter((s) => s.ativo);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const perfilMap = new Map(perfis.map((p) => [p.id, p]));
  const solicitantes = usuarios.filter((u) => perfilMap.get(u.perfil)?.podeAbrirChamado);
  const operadores = usuarios.filter((u) => perfilMap.get(u.perfil)?.podeAlterarStatus);

  const chamadoIds = chamados.map((c) => c.id);
  const mensagensNaoLidas = chamadoIds.length
    ? await prisma.mensagem.groupBy({
        by: ["chamadoId"],
        where: {
          chamadoId: { in: chamadoIds },
          autorId: { not: user.id },
          lidoEm: null,
        },
        _count: { _all: true },
      })
    : [];
  const naoLidasPorChamado = new Map(mensagensNaoLidas.map((m) => [m.chamadoId, m._count._all]));

  const pdvIdsComChamado = [...new Set(chamados.map((c) => c.pdvId))];
  const [horariosPorPdv, feriadosPorPdv] = pdvIdsComChamado.length
    ? await Promise.all([
        prisma.pdvHorario.findMany({ where: { pdvId: { in: pdvIdsComChamado } } }),
        prisma.feriado.findMany({ where: { pdvId: { in: pdvIdsComChamado } } }),
      ])
    : [[], []];
  const calendarioPorPdv = new Map<string, PdvCalendar>(
    pdvIdsComChamado.map((pdvId) => [
      pdvId,
      {
        horarios: horariosPorPdv.filter((h) => h.pdvId === pdvId),
        feriados: feriadosPorPdv.filter((f) => f.pdvId === pdvId).map((f) => f.data),
      },
    ])
  );

  const novoId = sp.novo;
  const finalizadoId = sp.finalizado;
  const destaqueId = novoId ?? finalizadoId;

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={5000} />
      <ClearNovoParam active={!!destaqueId} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Chamados</h1>
          <p className="text-sm text-muted-foreground">
            {total} chamado(s) encontrado(s)
            {totalPaginas > 1 && ` · página ${paginaAtual} de ${totalPaginas}`}
          </p>
        </div>
        {canOpenTicket(user) && (
          <Link href="/tickets/novo" className={buttonVariants({ variant: "default" })}>
            Novo chamado
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {statusesAtivos.map((status) => {
          const ativo = sp.status === status.id;
          return (
            <Link key={status.id} href={statusCardHref(sp, status.id)} className="flex min-w-[140px] flex-1">
              <Card
                className={cn(
                  "h-full w-full transition-colors hover:bg-muted/50",
                  ativo && "ring-2 ring-primary"
                )}
              >
                <CardContent className="flex h-full flex-col pt-4 pb-3">
                  <p className="min-h-8 text-xs text-muted-foreground">{status.nome}</p>
                  <p
                    className={cn(
                      "text-2xl font-semibold",
                      corBadgeClasses(status.cor)
                        .split(" ")
                        .filter((c) => c.includes("text-"))
                        .join(" ")
                    )}
                  >
                    {contagemPorStatus.get(status.id) ?? 0}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <TicketFilters searchParams={sp} />

      <Card>
        <CardContent className="pt-6" id="tickets-table-wrap">
          <Table className="text-xs [&_td]:text-xs [&_th]:h-7 [&_th]:bg-muted/50 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase">
            <TableHeader>
              <TableRow>
                <SortableHead sp={sp} campo="numero">
                  Chamado
                </SortableHead>
                <TableHead className="text-center">
                  <MultiSelectFilter
                    paramName="solicitanteId"
                    label="Aberto por"
                    options={solicitantes.map((u) => ({ value: u.id, label: u.nome }))}
                  />
                </TableHead>
                <TableHead className="text-center">
                  <MultiSelectFilter
                    paramName="pdvId"
                    label="PDV"
                    options={pdvs.map((p) => ({ value: p.id, label: `${p.codigo} — ${p.nome}` }))}
                  />
                </TableHead>
                <TableHead className="text-center">
                  <div className="inline-flex items-center gap-1">
                    <MultiSelectFilter
                      paramName="servicoId"
                      label="Serviço"
                      options={servicos.map((s) => ({ value: s.id, label: s.nome }))}
                    />
                    <SortToggle sp={sp} campo="servico" />
                  </div>
                </TableHead>
                <TableHead className="text-center">Revendedor</TableHead>
                <TableHead className="text-center">Código do revendedor</TableHead>
                <TableHead className="text-center">Pedido</TableHead>
                <TableHead className="text-center">
                  <div className="inline-flex items-center gap-1">
                    <MultiSelectFilter
                      paramName="sla"
                      label="SLA"
                      options={slaPresets.map((s) => ({
                        value: s.id,
                        label: s.nome,
                        dotClassName: corDotClasses(s.cor),
                      }))}
                    />
                    <SortToggle sp={sp} campo="sla" />
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="inline-flex items-center gap-1">
                    <MultiSelectFilter
                      paramName="status"
                      label="Status"
                      options={statusesAtivos.map((s) => ({
                        value: s.id,
                        label: s.nome,
                        dotClassName: statusDotClasses(s.cor),
                      }))}
                    />
                    <SortToggle sp={sp} campo="status" />
                  </div>
                </TableHead>
                <TableHead className="text-center">Mensagens</TableHead>
                <SortableHead sp={sp} campo="createdAt">
                  Aberto em
                </SortableHead>
                <SortableHead sp={sp} campo="finalizadoEm">
                  Finalizado em
                </SortableHead>
                <TableHead className="text-center">SLA (Total / Útil)</TableHead>
                <TableHead className="text-center">Assumir</TableHead>
                <TableHead className="text-center">
                  <MultiSelectFilter
                    paramName="operadorId"
                    label="Responsável"
                    options={[
                      { value: SEM_RESPONSAVEL_VALUE, label: "Sem responsável" },
                      ...operadores.map((u) => ({ value: u.id, label: u.nome })),
                    ]}
                  />
                </TableHead>
                <TableHead className="text-center">Abrir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chamados.map((c) => {
                const naoLidas = naoLidasPorChamado.get(c.id) ?? 0;
                const pdvCalendar = calendarioPorPdv.get(c.pdvId) ?? { horarios: [], feriados: [] };
                const conclusao = c.finalizadoEm ? tempoConclusaoChamado(c, pdvCalendar) : null;
                const alerta = classificarAlertaVencimento(c, config.alertaVencimentoHoras, pdvCalendar);

                return (
                  <TableRow
                    key={c.id}
                    className={cn(
                      alerta === "risco" &&
                        "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60",
                      alerta === "vencido" &&
                        "bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60",
                      c.id === destaqueId && "animate-[row-highlight-fade_4s_ease-out_forwards]"
                    )}
                  >
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-2">
                        <Link href={`/tickets/${c.id}`} className="font-medium hover:underline">
                          {formatarNumeroChamado(c.numero)}
                        </Link>
                        {c.id === novoId && <Badge variant="default">Novo</Badge>}
                        {c.id === finalizadoId && (
                          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600">
                            Finalizado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      <p className="mx-auto max-w-[160px] truncate" title={c.abertoPor.email}>
                        {c.abertoPor.email}
                      </p>
                      <p className="mx-auto max-w-[160px] truncate text-xs text-muted-foreground" title={c.nomeSolicitante}>
                        {c.nomeSolicitante}
                      </p>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      <p>{c.pdv.codigo}</p>
                      <p>{c.pdv.nome}</p>
                    </TableCell>
                    <TableCell className="text-center text-sm">{c.servico.nome}</TableCell>
                    <TableCell className="text-center text-sm">{c.pedido.nomeCliente}</TableCell>
                    <TableCell className="text-center text-sm">{c.pedido.codigoRevendedor}</TableCell>
                    <TableCell className="text-center text-sm">{c.pedido.numero}</TableCell>
                    <TableCell className="text-center">
                      <SlaBadge nome={c.slaPreset.nome} cor={c.slaPreset.cor} />
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge nome={statusInfo(c.status).nome} cor={statusInfo(c.status).cor} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Link
                        href={`/tickets/${c.id}`}
                        className="relative inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <MessageCircle className="size-4" />
                        {naoLidas > 0 && (
                          <span className="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                            {naoLidas}
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {fmtDataHora(c.createdAt)}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {c.finalizadoEm ? fmtDataHora(c.finalizadoEm) : "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs whitespace-nowrap">
                      {conclusao ? (
                        <span title={`Total: ${fmtHoras(conclusao.totalHoras)} · Útil: ${fmtHoras(conclusao.horasUteis)}`}>
                          {fmtHoras(conclusao.totalHoras)} / {fmtHoras(conclusao.horasUteis)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {c.responsavelId ? (
                        <span
                          title={`Assumido por ${c.responsavel?.nome ?? "alguém"}`}
                          className="inline-flex items-center justify-center text-emerald-600 dark:text-emerald-400"
                        >
                          <UserCheck className="size-4" />
                        </span>
                      ) : (
                        canChangeStatus(user) && <AssumirIconButton chamadoId={c.id} />
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {c.responsavel?.nome ?? (
                        <span className="text-muted-foreground">sem responsável</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link
                        href={`/tickets/${c.id}`}
                        title="Abrir chamado"
                        className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {chamados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={15} className="text-center text-sm text-muted-foreground py-6">
                    Nenhum chamado encontrado com esses filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <StickyHorizontalScrollbar wrapperId="tickets-table-wrap" />

          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              {paginaAtual > 1 ? (
                <Link href={pageHref(sp, paginaAtual - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Anterior
                </Link>
              ) : (
                <span className={buttonVariants({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })}>
                  Anterior
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                Página {paginaAtual} de {totalPaginas}
              </span>
              {paginaAtual < totalPaginas ? (
                <Link href={pageHref(sp, paginaAtual + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Próxima
                </Link>
              ) : (
                <span className={buttonVariants({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })}>
                  Próxima
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

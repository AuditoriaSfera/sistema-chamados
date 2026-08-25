import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatarDataHora } from "@/lib/datas";
import { canAccessChamado, canCancelOrReopenAny, canChangeStatus } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlaBadge, StatusBadge } from "@/lib/ticket-badges";
import { formatarNumeroChamado } from "@/lib/tickets";
import { MensagensPanel } from "./mensagens-panel";
import { StatusPanel } from "./status-panel";
import { ReaberturaPanel } from "./reabertura-panel";
import { AnexosPanel } from "./anexos-panel";
import { AssumirButton } from "./assumir-button";
import { ResponderSolicitanteForm } from "./responder-solicitante-form";

export default async function ChamadoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [config, chamado, statuses] = await Promise.all([
    prisma.configGeral.upsert({ where: { id: "geral" }, update: {}, create: { id: "geral" } }),
    prisma.chamado.findUnique({
      where: { id },
      include: {
        pedido: true,
        pdv: true,
        servico: true,
        slaPreset: true,
        abertoPor: true,
        responsavel: true,
        anexos: { where: { mensagemId: null }, orderBy: { createdAt: "asc" } },
        mensagens: {
          orderBy: { createdAt: "asc" },
          include: { autor: true, anexos: { orderBy: { createdAt: "asc" } } },
        },
        statusHistoricos: { orderBy: { createdAt: "asc" }, include: { usuario: true } },
      },
    }),
    prisma.status.findMany({ orderBy: { ordem: "asc" } }),
  ]);
  if (!chamado) notFound();
  if (!canAccessChamado(user, chamado)) notFound();

  const statusMap = new Map(statuses.map((s) => [s.id, s]));
  const statusInfo = (chave: string) => statusMap.get(chave) ?? { nome: chave, cor: "slate" };
  const statusesAtivos = statuses.filter((s) => s.ativo);

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <div>
          <Link
            href="/tickets"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar para chamados
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">
              Chamado {formatarNumeroChamado(chamado.numero)}
            </h1>
            <StatusBadge nome={statusInfo(chamado.status).nome} cor={statusInfo(chamado.status).cor} />
            <SlaBadge nome={chamado.slaPreset.nome} cor={chamado.slaPreset.cor} />
          </div>
          <p className="text-sm text-muted-foreground">
            {chamado.pdv.codigo} — {chamado.pdv.nome}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Descrição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Aberto por: </span>
              {chamado.abertoPor.email} ({chamado.abertoPor.nome})
            </p>
            <p>
              <span className="text-muted-foreground">Nome do solicitante: </span>
              {chamado.nomeSolicitante}
            </p>
            <p>
              <span className="text-muted-foreground">Serviço: </span>
              {chamado.servico.nome}
            </p>
            <p>
              <span className="text-muted-foreground">Revendedor: </span>
              {chamado.pedido.nomeCliente}
            </p>
            <p>
              <span className="text-muted-foreground">Código do revendedor: </span>
              {chamado.pedido.codigoRevendedor}
            </p>
            <p>
              <span className="text-muted-foreground">Pedido: </span>
              {chamado.pedido.numero}
            </p>
            <p>
              <span className="text-muted-foreground">Responsável: </span>
              {chamado.responsavel
                ? `${chamado.responsavel.email} (${chamado.responsavel.nome})`
                : "sem responsável assumido"}
            </p>
            <p className="whitespace-pre-wrap text-sky-600 dark:text-sky-400">
              <span className="text-muted-foreground">Descrição complementar: </span>
              {chamado.motivoLivre}
            </p>
            {chamado.motivoReabertura && (
              <p className="text-amber-600">
                <span className="text-muted-foreground">Motivo da reabertura: </span>
                {chamado.motivoReabertura}
              </p>
            )}
          </CardContent>
        </Card>

        <AnexosPanel anexos={chamado.anexos} />

        <MensagensPanel
          chamadoId={chamado.id}
          currentUserId={user.id}
          mensagens={chamado.mensagens.map((m) => ({
            id: m.id,
            texto: m.texto,
            autorId: m.autorId,
            autorNome: m.autor.nome,
            createdAt: m.createdAt.toISOString(),
            lidoEm: m.lidoEm?.toISOString() ?? null,
            apagadaEm: m.apagadaEm?.toISOString() ?? null,
            anexos: m.anexos.map((a) => ({
              id: a.id,
              nomeArquivo: a.nomeArquivo,
              tipo: a.tipo,
              tamanho: a.tamanho,
              apagadoEm: a.apagadoEm?.toISOString() ?? null,
            })),
          }))}
        />
      </div>

      <div className="space-y-6">
        {chamado.status === "AGUARDANDO_SOLICITANTE" &&
          user.escopoChamados === "PROPRIOS" &&
          chamado.abertoPorId === user.id && (
            <ResponderSolicitanteForm chamadoId={chamado.id} />
          )}

        {!chamado.responsavelId && (
          <Card>
            <CardContent className="pt-6">
              <AssumirButton chamadoId={chamado.id} />
            </CardContent>
          </Card>
        )}

        {canChangeStatus(user) ? (
          <StatusPanel chamadoId={chamado.id} statusAtual={chamado.status} statuses={statusesAtivos} />
        ) : chamado.abertoPorId === user.id || canCancelOrReopenAny(user) ? (
          <StatusPanel
            chamadoId={chamado.id}
            statusAtual={chamado.status}
            statuses={statusesAtivos}
            somenteOpcoes={["CANCELADO"]}
          />
        ) : null}

        <ReaberturaPanel
          chamadoId={chamado.id}
          status={chamado.status}
          finalizadoEm={chamado.finalizadoEm?.toISOString() ?? null}
          reaberturaPrazoDias={config.reaberturaPrazoDias}
          podeReaabrir={
            config.reaberturaSomenteAdmin
              ? user.podeGerenciarCadastros
              : user.podeGerenciarCadastros ||
                canCancelOrReopenAny(user) ||
                chamado.abertoPorId === user.id ||
                chamado.responsavelId === user.id
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {chamado.statusHistoricos.map((h, i) => {
                const statusMudou = i === 0 || chamado.statusHistoricos[i - 1].status !== h.status;
                return (
                  <li key={h.id} className="border-l-2 pl-3">
                    {statusMudou && (
                      <StatusBadge nome={statusInfo(h.status).nome} cor={statusInfo(h.status).cor} />
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {h.usuario.email} ({h.usuario.nome}) · {formatarDataHora(h.createdAt)}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap">{h.texto}</p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

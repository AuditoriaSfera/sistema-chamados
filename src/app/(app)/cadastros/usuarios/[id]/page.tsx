import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { podeGerenciarAlvo } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { derivarEscopoChamados } from "@/lib/constants";
import { PdvVinculoBusca } from "./pdv-vinculo-busca";
import { VePedidosEquipeToggle } from "./ve-pedidos-equipe-toggle";

export default async function UsuarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;

  const [usuario, pdvs] = await Promise.all([
    prisma.usuario.findUnique({ where: { id }, include: { pdvVinculos: true } }),
    prisma.pdv.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" } }),
  ]);
  if (!usuario) notFound();

  const perfil = await prisma.perfilAcesso.findUnique({ where: { id: usuario.perfil } });
  if (!perfil) notFound();

  const vinculadas = new Set(usuario.pdvVinculos.map((v) => v.pdvId));
  const escopo = derivarEscopoChamados(perfil);
  // Conta administrativa: só administrador pleno mexe. As actions recusam de
  // qualquer forma — aqui é para não oferecer um controle que vai dar erro.
  const podeMexer = podeGerenciarAlvo(user, perfil);
  const usaVinculoPdv = escopo === "PDVS_VINCULADOS" && podeMexer;
  const usaVePedidosEquipe = escopo === "PROPRIOS" && podeMexer;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">{usuario.nome}</h1>
        <p className="text-sm text-muted-foreground">
          {usuario.email} · {perfil.nome}
        </p>
      </div>

      {usaVePedidosEquipe && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visibilidade de chamados</CardTitle>
          </CardHeader>
          <CardContent>
            <VePedidosEquipeToggle
              usuarioId={usuario.id}
              valor={usuario.vePedidosDaEquipe}
            />
          </CardContent>
        </Card>
      )}

      {usaVinculoPdv && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vínculo de acesso por PDV</CardTitle>
            <p className="text-sm text-muted-foreground">
              O usuário só enxerga e responde chamados dos PDVs vinculados aqui.
            </p>
          </CardHeader>
          <CardContent>
            <PdvVinculoBusca
              usuarioId={usuario.id}
              pdvs={pdvs}
              vinculadasIds={Array.from(vinculadas)}
            />
          </CardContent>
        </Card>
      )}

      {!podeMexer && (
        <p className="text-sm text-muted-foreground">
          Este é um cadastro administrativo — só um administrador pleno pode alterá-lo.
        </p>
      )}

      {podeMexer && !usaVinculoPdv && !usaVePedidosEquipe && (
        <p className="text-sm text-muted-foreground">
          Este perfil enxerga todos os chamados, sem restrição por PDV.
        </p>
      )}
    </div>
  );
}

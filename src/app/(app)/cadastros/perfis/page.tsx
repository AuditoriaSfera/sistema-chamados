import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { corBadgeClasses, corDotClasses } from "@/lib/color-palette";
import {
  derivarEscopoChamados,
  ESCOPOS_CHAMADOS,
  ESCOPO_CHAMADOS_LABELS,
} from "@/lib/constants";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { SortToggle } from "@/components/sortable-head";
import { NovoPerfilDialog } from "./novo-perfil-dialog";
import { EditarPerfilDialog } from "./editar-perfil-dialog";
import { ExcluirPerfilDialog } from "./excluir-perfil-dialog";
import { PerfilAtivoToggle } from "./perfil-ativo-toggle";

const HEADER_CLASSES =
  "text-xs [&_td]:text-xs [&_th]:h-7 [&_th]:bg-muted/50 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase";

const BASE_PATH = "/cadastros/perfis";

const PERMISSOES_LABELS: Record<string, string> = {
  podeAbrirChamado: "Abrir chamado",
  podeAlterarStatus: "Alterar status",
  podeResponderChat: "Responder chat",
  podeCancelarReabrirProprio: "Cancelar/reabrir próprio",
  podeCancelarReabrirTodos: "Cancelar/reabrir de outros",
  podeVerRelatorios: "Relatórios",
  podeGerenciarCadastros: "Cadastros",
};

export default async function PerfisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const todos = await prisma.perfilAcesso.findMany({ orderBy: { ordem: "asc" } });

  const idValues = new Set((sp.id ?? "").split(",").filter(Boolean));
  const escopoValues = new Set((sp.escopo ?? "").split(",").filter(Boolean));
  const ativoValues = new Set((sp.ativo ?? "").split(",").filter(Boolean));
  const filtrados = todos.filter(
    (p) =>
      (idValues.size === 0 || idValues.has(p.id)) &&
      (escopoValues.size === 0 || escopoValues.has(derivarEscopoChamados(p))) &&
      (ativoValues.size === 0 || ativoValues.has(String(Number(p.ativo))))
  );

  const campo = sp.sort;
  const direcao = sp.dir === "asc" ? 1 : -1;
  const perfis = campo
    ? [...filtrados].sort((a, b) => {
        let cmp = 0;
        if (campo === "escopo") {
          cmp = ESCOPO_CHAMADOS_LABELS[derivarEscopoChamados(a)].localeCompare(
            ESCOPO_CHAMADOS_LABELS[derivarEscopoChamados(b)]
          );
        } else if (campo === "ativo") {
          cmp = Number(a.ativo) - Number(b.ativo);
        } else {
          cmp = a.nome.localeCompare(b.nome);
        }
        return direcao * cmp;
      })
    : filtrados;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Perfis</h1>
          <p className="text-sm text-muted-foreground">
            Perfis de acesso e as permissões de cada um. Cada usuário tem um perfil vinculado.
          </p>
        </div>
        <NovoPerfilDialog />
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
                      options={todos.map((p) => ({
                        value: p.id,
                        label: p.nome,
                        dotClassName: corDotClasses(p.cor),
                      }))}
                    />
                    <SortToggle basePath={BASE_PATH} sp={sp} campo="nome" />
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="inline-flex items-center gap-1">
                    <MultiSelectFilter
                      paramName="escopo"
                      label="Escopo de chamados"
                      options={ESCOPOS_CHAMADOS.map((e) => ({
                        value: e,
                        label: ESCOPO_CHAMADOS_LABELS[e],
                      }))}
                    />
                    <SortToggle basePath={BASE_PATH} sp={sp} campo="escopo" />
                  </div>
                </TableHead>
                <TableHead className="text-center">Permissões</TableHead>
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
              {perfis.map((p) => {
                const permissoesAtivas = Object.keys(PERMISSOES_LABELS).filter(
                  (k) => p[k as keyof typeof p] === true
                );
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-center align-top">
                      <Badge variant="outline" className={corBadgeClasses(p.cor)}>
                        <span
                          className={`mr-1 inline-block size-2 rounded-full ${corDotClasses(p.cor)}`}
                        />
                        {p.nome}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center align-top text-xs">
                      {ESCOPO_CHAMADOS_LABELS[derivarEscopoChamados(p)]}
                    </TableCell>
                    <TableCell
                      className="text-center align-top text-xs"
                      title={permissoesAtivas.map((k) => PERMISSOES_LABELS[k]).join(", ")}
                    >
                      {permissoesAtivas.length > 0
                        ? `${permissoesAtivas.length} permiss${permissoesAtivas.length > 1 ? "ões" : "ão"}`
                        : "Nenhuma"}
                    </TableCell>
                    <TableCell className="text-center align-top">
                      <Badge variant={p.ativo ? "default" : "secondary"}>
                        {p.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center align-top">
                      <div className="flex items-center justify-center gap-1">
                        <EditarPerfilDialog perfil={p} />
                        <ExcluirPerfilDialog perfil={p} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center align-top">
                      <PerfilAtivoToggle perfilId={p.id} ativo={p.ativo} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {perfis.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    Nenhum perfil encontrado.
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

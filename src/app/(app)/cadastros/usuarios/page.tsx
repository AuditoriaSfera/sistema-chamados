import Link from "next/link";
import { Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { isPerfilAdministrativo, podeGerenciarAlvo } from "@/lib/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { corBadgeClasses, corDotClasses, type ColorKey } from "@/lib/color-palette";
import { Card, CardContent } from "@/components/ui/card";
import { SummaryCard } from "@/components/summary-card";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { SearchFilter } from "@/components/search-filter";
import { ClearNovoParam } from "@/components/clear-novo-param";
import { ScrollToId } from "@/components/scroll-to-id";
import { SortableHead, SortToggle } from "@/components/sortable-head";
import { cn } from "@/lib/utils";
import { NovoUsuarioDialog } from "./novo-usuario-dialog";
import { UsuarioAtivoToggle } from "./usuario-ativo-toggle";
import { EditarUsuarioDialog } from "./editar-usuario-dialog";
import { ExcluirUsuarioDialog } from "./excluir-usuario-dialog";
import { VincularPdvsDialog } from "./vincular-pdvs-dialog";

const BASE_PATH = "/cadastros/usuarios";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireAdmin();
  const sp = await searchParams;

  const [todos, todosPerfis, pdvsAtivos] = await Promise.all([
    prisma.usuario.findMany({ include: { pdvVinculos: { include: { pdv: true } } } }),
    prisma.perfilAcesso.findMany({ orderBy: { ordem: "asc" } }),
    prisma.pdv.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" } }),
  ]);
  const perfilMap = new Map(todosPerfis.map((p) => [p.id, p]));
  // Quem não é administrador pleno não atribui perfil administrativo — o
  // servidor recusa, então esses perfis nem entram no seletor dos formulários.
  const perfisAtivos = todosPerfis
    .filter((p) => p.ativo)
    .filter((p) => user.podeGerenciarAdministradores || !isPerfilAdministrativo(p));

  /** Contas administrativas só são editáveis por administrador pleno. */
  function gerenciavel(perfilId: string) {
    const perfil = perfilMap.get(perfilId);
    return perfil ? podeGerenciarAlvo(user, perfil) : true;
  }

  const idValues = new Set((sp.id ?? "").split(",").filter(Boolean));
  const perfilValues = new Set((sp.perfil ?? "").split(",").filter(Boolean));
  const ativoValues = new Set((sp.ativo ?? "").split(",").filter(Boolean));
  const busca = (sp.busca ?? "").trim().toLowerCase();
  const bateOutrosFiltros = (u: (typeof todos)[number]) =>
    (idValues.size === 0 || idValues.has(u.id)) &&
    (ativoValues.size === 0 || ativoValues.has(String(Number(u.ativo)))) &&
    (busca === "" || u.nome.toLowerCase().includes(busca) || u.email.toLowerCase().includes(busca));
  // Contagem por perfil ignora o filtro de perfil atual, pra os cards sempre
  // mostrarem a distribuição completa (respeitando os demais filtros ativos).
  const filtradosSemPerfil = todos.filter(bateOutrosFiltros);
  const filtrados = filtradosSemPerfil.filter(
    (u) => perfilValues.size === 0 || perfilValues.has(u.perfil)
  );

  /** Preserva os demais filtros ativos e alterna (ativa/desativa) o filtro de perfil clicado. */
  function perfilCardHref(perfilId: string | null) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v && k !== "perfil") params.set(k, v);
    }
    const jaAtivo = perfilId !== null && perfilValues.size === 1 && perfilValues.has(perfilId);
    if (perfilId && !jaAtivo) params.set("perfil", perfilId);
    const query = params.toString();
    return query ? `${BASE_PATH}?${query}` : BASE_PATH;
  }

  const campo = sp.sort ?? "nome";
  const direcao = sp.sort ? (sp.dir === "asc" ? 1 : -1) : 1;
  const usuarios = [...filtrados].sort((a, b) => {
    let cmp = 0;
    if (campo === "email") cmp = a.email.localeCompare(b.email);
    else if (campo === "perfil") cmp = a.perfil.localeCompare(b.perfil);
    else if (campo === "ativo") cmp = Number(a.ativo) - Number(b.ativo);
    else cmp = a.nome.localeCompare(b.nome);
    return direcao * cmp;
  });

  const novoId = sp.novo;

  return (
    <div className="space-y-6">
      <ClearNovoParam active={!!novoId} />
      <ScrollToId id={novoId} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Perfil de acesso e, para Operador/Gestor de VD, o vínculo com o(s) PDV(s).
          </p>
        </div>
        <NovoUsuarioDialog perfis={perfisAtivos} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Link href={perfilCardHref(null)}>
          <SummaryCard label="Total" icon={Users} color="slate">
            <p className="text-2xl font-semibold">{filtrados.length}</p>
          </SummaryCard>
        </Link>
        {todosPerfis
          .filter((p) => p.ativo)
          .map((p) => (
            <Link key={p.id} href={perfilCardHref(p.id)}>
              <SummaryCard label={p.nome} icon={Users} color={p.cor as ColorKey}>
                <p className="text-2xl font-semibold">
                  {filtradosSemPerfil.filter((u) => u.perfil === p.id).length}
                </p>
              </SummaryCard>
            </Link>
          ))}
      </div>

      <SearchFilter paramName="busca" placeholder="Buscar por nome ou usuário..." className="max-w-sm" />

      <Card>
        <CardContent className="pt-6">
          <Table className="[&_th]:h-7 [&_th]:bg-muted/50 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase">
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="inline-flex items-center gap-1">
                    <MultiSelectFilter
                      paramName="id"
                      label="Nome"
                      options={todos.map((u) => ({ value: u.id, label: u.nome }))}
                    />
                    <SortToggle basePath={BASE_PATH} sp={sp} campo="nome" />
                  </div>
                </TableHead>
                <SortableHead basePath={BASE_PATH} sp={sp} campo="email">
                  Usuário
                </SortableHead>
                <TableHead>
                  <div className="inline-flex items-center gap-1">
                    <MultiSelectFilter
                      paramName="perfil"
                      label="Perfil"
                      options={todosPerfis.map((p) => ({ value: p.id, label: p.nome }))}
                    />
                    <SortToggle basePath={BASE_PATH} sp={sp} campo="perfil" />
                  </div>
                </TableHead>
                <TableHead>PDVs vinculados</TableHead>
                <TableHead>
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
                <TableHead>Ações</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => {
                const podeMexer = gerenciavel(u.perfil);
                return (
                <TableRow
                  key={u.id}
                  id={u.id}
                  className={cn(u.id === novoId && "animate-[row-highlight-fade_4s_ease-out_forwards]")}
                >
                  <TableCell>
                    <div className="inline-flex items-center gap-2">
                      <Link href={`/cadastros/usuarios/${u.id}`} className="font-medium hover:underline">
                        {u.nome}
                      </Link>
                      {u.id === novoId && <Badge variant="default">Novo</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{u.email}</TableCell>
                  <TableCell>
                    {(() => {
                      const perfil = perfilMap.get(u.perfil);
                      return perfil ? (
                        <Badge variant="outline" className={corBadgeClasses(perfil.cor)}>
                          <span
                            className={`mr-1 inline-block size-2 rounded-full ${corDotClasses(perfil.cor)}`}
                          />
                          {perfil.nome}
                        </Badge>
                      ) : (
                        "—"
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <span title={u.pdvVinculos.map((v) => v.pdv.codigo).join(", ")}>
                        {u.pdvVinculos.length === 0
                          ? "—"
                          : u.pdvVinculos.length === 1
                            ? u.pdvVinculos[0].pdv.codigo
                            : `${u.pdvVinculos.length} PDVs`}
                      </span>
                      {podeMexer && (
                        <VincularPdvsDialog
                          usuarioId={u.id}
                          usuarioNome={u.nome}
                          pdvs={pdvsAtivos}
                          vinculadasIds={u.pdvVinculos.map((v) => v.pdvId)}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.ativo ? "default" : "secondary"}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {podeMexer ? (
                      <div className="flex items-center gap-1">
                        <EditarUsuarioDialog usuario={u} perfis={perfisAtivos} />
                        <ExcluirUsuarioDialog usuario={u} />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Administrador</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {podeMexer && <UsuarioAtivoToggle usuarioId={u.id} ativo={u.ativo} />}
                  </TableCell>
                </TableRow>
                );
              })}
              {usuarios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                    Nenhum usuário encontrado.
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

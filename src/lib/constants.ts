// Perfil de acesso agora é um cadastro dinâmico (model PerfilAcesso, ver
// src/app/(app)/cadastros/perfis) — o admin cria/edita perfis e marca quais
// permissões cada um tem. Visibilidade de chamados: o vínculo com PDV sempre
// restringe (ver src/lib/permissions.ts#getVisiblePdvIds) — a única escolha
// que resta é "só os próprios" vs. "todo mundo do(s) PDV(s) vinculado(s)".
export const ESCOPOS_CHAMADOS = ["PROPRIOS", "TODOS"] as const;
export type EscopoChamados = (typeof ESCOPOS_CHAMADOS)[number];

export const ESCOPO_CHAMADOS_LABELS: Record<EscopoChamados, string> = {
  PROPRIOS: "Só os chamados que o usuário abriu",
  TODOS: "Todos os chamados dos PDVs vinculados ao usuário",
};

/** O escopo não é mais escolhido diretamente — é derivado de veSomenteProprios. */
export function derivarEscopoChamados(perfil: { veSomenteProprios: boolean }): EscopoChamados {
  return perfil.veSomenteProprios ? "PROPRIOS" : "TODOS";
}

export const CATEGORIAS_SERVICO = [
  "ENTREGA",
  "DEVOLUCAO",
  "PRODUTO",
  "TRANSPORTE",
  "ESTOQUE",
  "FINANCEIRO",
] as const;
export type CategoriaServico = (typeof CATEGORIAS_SERVICO)[number];

export const CATEGORIA_LABELS: Record<CategoriaServico, string> = {
  ENTREGA: "Entrega",
  DEVOLUCAO: "Devolução",
  PRODUTO: "Produto",
  TRANSPORTE: "Transporte",
  ESTOQUE: "Estoque",
  FINANCEIRO: "Financeiro",
};

// Status do fluxo do chamado agora é um cadastro dinâmico (model Status, ver
// src/app/(app)/cadastros/status). As chaves abaixo são só os IDs fixos dos
// 7 status originais, usados para comparações literais no código (ex.: qual
// status conta como finalizado, qual dispara retomada automática do chat).
export const STATUS_FINAIS = ["FINALIZADO", "CANCELADO"];

// Status que pausam a contagem de SLA (não usado atualmente)
export const STATUS_PAUSA_SLA = ["AGUARDANDO_SOLICITANTE", "AGUARDANDO_TRANSPORTADORA"];

export const SUB_MOTIVOS_FINALIZACAO = [
  "PROCEDENTE",
  "IMPROCEDENTE",
  "PARCIALMENTE_PROCEDENTE",
] as const;
export type SubMotivoFinalizacao = (typeof SUB_MOTIVOS_FINALIZACAO)[number];

export const SUB_MOTIVO_LABELS: Record<SubMotivoFinalizacao, string> = {
  PROCEDENTE: "Procedente",
  IMPROCEDENTE: "Improcedente",
  PARCIALMENTE_PROCEDENTE: "Parcialmente procedente",
};

export const TIPOS_ANEXO = ["IMAGEM", "PDF", "VIDEO"] as const;
export type TipoAnexo = (typeof TIPOS_ANEXO)[number];

export const ANEXO_MAX_QUANTIDADE = 5;
export const ANEXO_MAX_TAMANHO_BYTES: Record<TipoAnexo, number> = {
  IMAGEM: 5 * 1024 * 1024,
  PDF: 10 * 1024 * 1024,
  VIDEO: 20 * 1024 * 1024,
};

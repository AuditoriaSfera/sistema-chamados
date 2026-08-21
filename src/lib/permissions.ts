import type { EscopoChamados } from "./constants";

export type SessionUser = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  perfilNome: string;
  vePedidosDaEquipe: boolean;
  pdvIds: string[];
  podeAbrirChamado: boolean;
  podeAlterarStatus: boolean;
  podeResponderChat: boolean;
  podeCancelarReabrirProprio: boolean;
  podeCancelarReabrirTodos: boolean;
  podeVerRelatorios: boolean;
  podeGerenciarCadastros: boolean;
  escopoChamados: EscopoChamados;
  senhaProvisoria: boolean;
};

export function canOpenTicket(user: SessionUser) {
  return user.podeAbrirChamado;
}

export function canRespondChat(user: SessionUser) {
  return user.podeResponderChat;
}

export function canChangeStatus(user: SessionUser) {
  return user.podeAlterarStatus;
}

export function canCancelOrReopenOwn(user: SessionUser) {
  return user.podeCancelarReabrirProprio;
}

export function canCancelOrReopenAny(user: SessionUser) {
  return user.podeCancelarReabrirTodos;
}

export function canManageCadastros(user: SessionUser) {
  return user.podeGerenciarCadastros;
}

export function canViewReports(user: SessionUser) {
  return user.podeVerRelatorios;
}

/**
 * Retorna os ids de PDV que o usuário pode enxergar na fila/listagem, ou `null`
 * quando o usuário tem visão ampla (todos os PDVs — inclui quem tem escopo
 * PROPRIOS, já que a abertura não sabe de antemão qual PDV vai atender).
 */
export function getVisiblePdvIds(user: SessionUser): string[] | null {
  if (user.escopoChamados !== "PDVS_VINCULADOS") return null;
  return user.pdvIds;
}

/** Um usuário com escopo PROPRIOS só vê os próprios chamados, a menos que vePedidosDaEquipe esteja ligado */
export function ticketScopeFilterForRequester(user: SessionUser) {
  if (user.escopoChamados !== "PROPRIOS") return null;
  if (user.vePedidosDaEquipe) return null;
  return user.id;
}

export function canAccessChamado(
  user: SessionUser,
  chamado: { pdvId: string; abertoPorId: string }
) {
  const visiblePdvIds = getVisiblePdvIds(user);
  if (visiblePdvIds !== null && !visiblePdvIds.includes(chamado.pdvId)) return false;

  const requesterScope = ticketScopeFilterForRequester(user);
  if (requesterScope && chamado.abertoPorId !== requesterScope) return false;

  return true;
}

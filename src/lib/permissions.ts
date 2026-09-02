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
  podeGerenciarAdministradores: boolean;
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

/** As permissões que tornam um perfil administrativo. */
export type PerfilAdministrativo = {
  podeGerenciarCadastros: boolean;
  podeGerenciarAdministradores: boolean;
};

/**
 * Um perfil é administrativo quando gerencia cadastros: quem tem esse poder
 * mexe em usuários, perfis e nas regras do sistema.
 *
 * Alterar o cadastro de uma conta assim equivale a assumir os poderes dela —
 * trocar o perfil de um administrador, redefinir a senha dele ou desativá-lo
 * dá ou tira acesso total. Por isso contas administrativas só são alcançadas
 * por quem tem podeGerenciarAdministradores (ver podeGerenciarAlvo).
 */
export function isPerfilAdministrativo(perfil: PerfilAdministrativo) {
  return perfil.podeGerenciarCadastros || perfil.podeGerenciarAdministradores;
}

export function canManageAdmins(user: SessionUser) {
  return user.podeGerenciarAdministradores;
}

/**
 * Quem gerencia cadastros pode mexer no cadastro (usuário ou perfil) cujo
 * perfil de acesso é `perfilAlvo`?
 *
 * Alvo comum: sim. Alvo administrativo: só administrador pleno. Note que o
 * próprio perfil de quem age é administrativo — ele gerencia cadastros —,
 * então essa mesma regra impede que um gestor de cadastros edite o perfil
 * dele para se dar permissões novas.
 */
export function podeGerenciarAlvo(user: SessionUser, perfilAlvo: PerfilAdministrativo) {
  if (!user.podeGerenciarCadastros) return false;
  if (!isPerfilAdministrativo(perfilAlvo)) return true;
  return user.podeGerenciarAdministradores;
}

export function canViewReports(user: SessionUser) {
  return user.podeVerRelatorios;
}

/**
 * Ids de PDV que o usuário pode enxergar na fila/listagem — sempre os PDVs
 * vinculados a ele, sem exceção. Nenhum perfil (nem Administrador) enxerga
 * chamado de PDV fora do próprio vínculo; visão ampla se consegue vinculando
 * o usuário a todos os PDVs, não por um perfil com "vê tudo".
 */
export function getVisiblePdvIds(user: SessionUser): string[] {
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
  if (!getVisiblePdvIds(user).includes(chamado.pdvId)) return false;

  const requesterScope = ticketScopeFilterForRequester(user);
  if (requesterScope && chamado.abertoPorId !== requesterScope) return false;

  return true;
}

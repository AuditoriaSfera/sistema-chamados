import { describe, expect, it } from "vitest";
import {
  canAccessChamado,
  getVisiblePdvIds,
  isPerfilAdministrativo,
  podeGerenciarAlvo,
  ticketScopeFilterForRequester,
  type SessionUser,
} from "./permissions";

function user(overrides: Partial<SessionUser>): SessionUser {
  return {
    id: "u1",
    nome: "Usuário",
    email: "u1@demo.local",
    perfil: "perfil-solicitante",
    perfilNome: "Solicitante",
    vePedidosDaEquipe: false,
    pdvIds: [],
    podeAbrirChamado: true,
    podeAlterarStatus: false,
    podeResponderChat: true,
    podeCancelarReabrirProprio: true,
    podeCancelarReabrirTodos: false,
    podeVerRelatorios: true,
    podeGerenciarCadastros: false,
    podeGerenciarAdministradores: false,
    escopoChamados: "PROPRIOS",
    senhaProvisoria: false,
    ...overrides,
  };
}

describe("getVisiblePdvIds", () => {
  it("Administrador e Gestor com escopo TODOS têm visão ampla (null)", () => {
    expect(getVisiblePdvIds(user({ escopoChamados: "TODOS" }))).toBeNull();
    expect(getVisiblePdvIds(user({ escopoChamados: "PROPRIOS" }))).toBeNull();
  });

  it("Perfil com escopo PDVS_VINCULADOS só vê os PDVs vinculados", () => {
    const u = user({ escopoChamados: "PDVS_VINCULADOS", pdvIds: ["pdv1", "pdv2"] });
    expect(getVisiblePdvIds(u)).toEqual(["pdv1", "pdv2"]);
  });
});

describe("ticketScopeFilterForRequester", () => {
  it("Escopo PROPRIOS sem vePedidosDaEquipe só vê os próprios chamados", () => {
    const u = user({ escopoChamados: "PROPRIOS", id: "u42", vePedidosDaEquipe: false });
    expect(ticketScopeFilterForRequester(u)).toBe("u42");
  });

  it("Escopo PROPRIOS com vePedidosDaEquipe vê tudo (null)", () => {
    const u = user({ escopoChamados: "PROPRIOS", vePedidosDaEquipe: true });
    expect(ticketScopeFilterForRequester(u)).toBeNull();
  });

  it("Escopo TODOS não é restrito ao próprio autor", () => {
    expect(ticketScopeFilterForRequester(user({ escopoChamados: "TODOS" }))).toBeNull();
  });
});

describe("canAccessChamado — escopo por PDV", () => {
  it("Escopo PDVS_VINCULADOS não acessa chamado de PDV fora do vínculo", () => {
    const u = user({ escopoChamados: "PDVS_VINCULADOS", pdvIds: ["pdv1"] });
    const chamado = { pdvId: "pdv2", abertoPorId: "outro" };
    expect(canAccessChamado(u, chamado)).toBe(false);
  });

  it("Escopo PDVS_VINCULADOS acessa chamado do próprio PDV", () => {
    const u = user({ escopoChamados: "PDVS_VINCULADOS", pdvIds: ["pdv1"] });
    const chamado = { pdvId: "pdv1", abertoPorId: "outro" };
    expect(canAccessChamado(u, chamado)).toBe(true);
  });

  it("Escopo PROPRIOS sem vePedidosDaEquipe não acessa chamado aberto por outro usuário", () => {
    const u = user({ escopoChamados: "PROPRIOS", id: "u42", vePedidosDaEquipe: false });
    const chamado = { pdvId: "pdv1", abertoPorId: "outro" };
    expect(canAccessChamado(u, chamado)).toBe(false);
  });
});

describe("escopo PROPRIOS combinado com vePedidosDaEquipe", () => {
  // Regressão: com PROPRIOS os dois filtros de canAccessChamado caíam ao mesmo
  // tempo — o de PDV por desenho, o de dono por causa do flag — e o perfil MAIS
  // restritivo passava a enxergar todo chamado do banco.
  const doPdvDele = { pdvId: "pdv1", abertoPorId: "outro" };
  const deOutroPdv = { pdvId: "pdv9", abertoPorId: "outro" };

  function equipe() {
    return user({ escopoChamados: "PROPRIOS", vePedidosDaEquipe: true, pdvIds: ["pdv1"] });
  }

  it("restringe aos PDVs vinculados em vez de liberar tudo", () => {
    expect(getVisiblePdvIds(equipe())).toEqual(["pdv1"]);
  });

  it("vê chamado de terceiro dentro do PDV dele", () => {
    expect(canAccessChamado(equipe(), doPdvDele)).toBe(true);
  });

  it("NÃO vê chamado de PDV a que não está vinculado", () => {
    expect(canAccessChamado(equipe(), deOutroPdv)).toBe(false);
  });

  it("sem vínculo nenhum, não vê chamado de terceiro", () => {
    const semPdv = user({ escopoChamados: "PROPRIOS", vePedidosDaEquipe: true, pdvIds: [] });
    expect(canAccessChamado(semPdv, doPdvDele)).toBe(false);
  });

  it("continua vendo os próprios chamados, em qualquer PDV", () => {
    const u = equipe();
    expect(canAccessChamado(u, { pdvId: "pdv1", abertoPorId: u.id })).toBe(true);
  });

  it("sem o flag, o filtro de dono segue valendo e o de PDV continua aberto", () => {
    const u = user({ escopoChamados: "PROPRIOS", vePedidosDaEquipe: false, pdvIds: ["pdv1"] });
    expect(getVisiblePdvIds(u)).toBeNull();
    expect(canAccessChamado(u, { pdvId: "pdv9", abertoPorId: u.id })).toBe(true);
    expect(canAccessChamado(u, doPdvDele)).toBe(false);
  });

  it("escopo TODOS não é afetado pelo flag", () => {
    const u = user({ escopoChamados: "TODOS", vePedidosDaEquipe: true, pdvIds: [] });
    expect(getVisiblePdvIds(u)).toBeNull();
    expect(canAccessChamado(u, deOutroPdv)).toBe(true);
  });
});

describe("perfis administrativos", () => {
  const comum = { podeGerenciarCadastros: false, podeGerenciarAdministradores: false };
  const gestorCadastros = { podeGerenciarCadastros: true, podeGerenciarAdministradores: false };
  const adminPleno = { podeGerenciarCadastros: true, podeGerenciarAdministradores: true };

  function supervisor() {
    return user({ podeGerenciarCadastros: true, podeGerenciarAdministradores: false });
  }
  function admin() {
    return user({ podeGerenciarCadastros: true, podeGerenciarAdministradores: true });
  }

  it("é administrativo quem gerencia cadastros ou administradores", () => {
    expect(isPerfilAdministrativo(comum)).toBe(false);
    expect(isPerfilAdministrativo(gestorCadastros)).toBe(true);
    expect(isPerfilAdministrativo(adminPleno)).toBe(true);
    // perfil só com a segunda flag também conta — senão escaparia da trava
    expect(
      isPerfilAdministrativo({ podeGerenciarCadastros: false, podeGerenciarAdministradores: true })
    ).toBe(true);
  });

  it("supervisor de cadastros mexe em perfil comum", () => {
    expect(podeGerenciarAlvo(supervisor(), comum)).toBe(true);
  });

  it("supervisor de cadastros NÃO mexe em perfil administrativo", () => {
    expect(podeGerenciarAlvo(supervisor(), gestorCadastros)).toBe(false);
    expect(podeGerenciarAlvo(supervisor(), adminPleno)).toBe(false);
  });

  // O perfil do próprio supervisor é administrativo, então a mesma regra que
  // protege o administrador impede que ele edite o perfil dele e se promova.
  it("supervisor não alcança o próprio perfil", () => {
    const u = supervisor();
    expect(podeGerenciarAlvo(u, { podeGerenciarCadastros: true, podeGerenciarAdministradores: false })).toBe(
      false
    );
  });

  it("administrador pleno mexe em qualquer perfil", () => {
    expect(podeGerenciarAlvo(admin(), comum)).toBe(true);
    expect(podeGerenciarAlvo(admin(), gestorCadastros)).toBe(true);
    expect(podeGerenciarAlvo(admin(), adminPleno)).toBe(true);
  });

  it("quem não gerencia cadastros não mexe em nada", () => {
    const solicitante = user({ podeGerenciarCadastros: false });
    expect(podeGerenciarAlvo(solicitante, comum)).toBe(false);
  });
});

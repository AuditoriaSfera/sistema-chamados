import { describe, expect, it } from "vitest";
import {
  canAccessChamado,
  getVisiblePdvIds,
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

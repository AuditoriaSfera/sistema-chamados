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

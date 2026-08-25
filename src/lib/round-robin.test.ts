import { describe, it, expect } from "vitest";

/**
 * Réplica da escolha feita em resolveResponsavelAutomatico (lib/tickets.ts).
 *
 * A função de verdade consulta o banco, então o que dá para testar sem infra é
 * a aritmética da rotação — que é exatamente onde estava o bug: o código lia o
 * próximo com +1 e gravava o ponteiro com +2, avançando duas casas por chamado.
 */
function rodada(ids: string[], ponteiro: string | null) {
  const idx = ids.findIndex((id) => id === ponteiro);
  const base = idx === -1 ? 0 : idx;
  return { escolhido: ids[base], seguinte: ids[(base + 1) % ids.length] };
}

function distribuir(ids: string[], quantos: number) {
  let ponteiro: string | null = null;
  const saida: string[] = [];
  for (let i = 0; i < quantos; i++) {
    const { escolhido, seguinte } = rodada(ids, ponteiro);
    saida.push(escolhido);
    ponteiro = seguinte;
  }
  return saida;
}

describe("rotação do round-robin", () => {
  it("com 4 operadores, distribui para os 4 — não só para metade", () => {
    // Regressão: gravando +2, a sequência era A,C,A,C e B e D nunca recebiam.
    const saida = distribuir(["A", "B", "C", "D"], 8);
    expect(saida).toEqual(["A", "B", "C", "D", "A", "B", "C", "D"]);
  });

  it("todo mundo recebe a mesma quantidade numa volta inteira", () => {
    const ids = ["A", "B", "C", "D", "E", "F"];
    const saida = distribuir(ids, ids.length * 3);
    for (const id of ids) {
      expect(saida.filter((x) => x === id)).toHaveLength(3);
    }
  });

  it("lista de tamanho ímpar também cobre todos", () => {
    const saida = distribuir(["A", "B", "C"], 6);
    expect(saida).toEqual(["A", "B", "C", "A", "B", "C"]);
  });

  it("com um único operador, sempre ele, sem estourar índice", () => {
    expect(distribuir(["A"], 3)).toEqual(["A", "A", "A"]);
  });

  it("começa do primeiro quando ainda não há ponteiro", () => {
    expect(rodada(["A", "B", "C"], null).escolhido).toBe("A");
  });

  it("recomeça do primeiro se o ponteiro aponta para quem saiu da lista", () => {
    // operador desvinculado ou desativado entre um chamado e outro
    expect(rodada(["A", "B", "C"], "Z").escolhido).toBe("A");
  });

  it("o ponteiro sempre aponta para quem recebe o próximo", () => {
    const { escolhido, seguinte } = rodada(["A", "B", "C"], "B");
    expect(escolhido).toBe("B");
    expect(seguinte).toBe("C");
    expect(rodada(["A", "B", "C"], seguinte).escolhido).toBe("C");
  });

  it("dá a volta no fim da lista", () => {
    expect(rodada(["A", "B", "C"], "C").seguinte).toBe("A");
  });
});

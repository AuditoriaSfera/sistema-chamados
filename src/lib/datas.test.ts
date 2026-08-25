import { describe, it, expect } from "vitest";
import { formatarDataHora, formatarDataHoraSegundos, formatarData } from "./datas";

// Instante real do chamado #1 em produção: 25/08/2026 13:18:41 em São Paulo.
// O container do Railway roda em UTC, e era isso que fazia a tela mostrar 16:18.
const CHAMADO_1 = new Date("2026-08-25T16:18:41.689Z");

describe("formatarDataHora", () => {
  it("exibe o horário de São Paulo, não o do runtime", () => {
    expect(formatarDataHora(CHAMADO_1)).toBe("25/08/2026, 13:18");
  });

  it("aceita string ISO, como chega do server component para o client", () => {
    expect(formatarDataHora("2026-08-25T16:18:41.689Z")).toBe("25/08/2026, 13:18");
  });

  it("string e Date produzem o mesmo texto", () => {
    // É isso que elimina a divergência de hidratação: o servidor formata a Date
    // e o navegador formata a string ISO, e os dois precisam bater exatamente.
    expect(formatarDataHora(CHAMADO_1)).toBe(formatarDataHora(CHAMADO_1.toISOString()));
  });

  it("vira o dia corretamente na fronteira do fuso", () => {
    // 02:30 UTC do dia 26 ainda é 23:30 do dia 25 em São Paulo
    expect(formatarDataHora("2026-08-26T02:30:00.000Z")).toBe("25/08/2026, 23:30");
  });

  it("meia-noite em São Paulo cai no dia certo", () => {
    expect(formatarDataHora("2026-08-26T03:00:00.000Z")).toBe("26/08/2026, 00:00");
  });
});

describe("formatarDataHoraSegundos", () => {
  it("inclui o segundo, para a trilha de auditoria", () => {
    expect(formatarDataHoraSegundos(CHAMADO_1)).toBe("25/08/2026, 13:18:41");
  });
});

describe("formatarData", () => {
  it("exibe só o dia, no fuso do app", () => {
    expect(formatarData(CHAMADO_1)).toBe("25/08/2026");
  });

  it("não adianta o dia perto da meia-noite UTC", () => {
    // 01:00 UTC do dia 26 é 22:00 do dia 25 em São Paulo
    expect(formatarData("2026-08-26T01:00:00.000Z")).toBe("25/08/2026");
  });
});

describe("independência do fuso do processo", () => {
  it("o resultado não muda com o TZ do runtime", () => {
    // Regressão da causa-raiz: sem timeZone explícito, este mesmo instante
    // renderizava 16:18 no servidor (UTC) e 13:18 no navegador (BRT).
    const antes = process.env.TZ;
    try {
      process.env.TZ = "UTC";
      const emUtc = formatarDataHora(CHAMADO_1);
      process.env.TZ = "America/Sao_Paulo";
      const emBrt = formatarDataHora(CHAMADO_1);
      expect(emUtc).toBe(emBrt);
      expect(emUtc).toBe("25/08/2026, 13:18");
    } finally {
      if (antes === undefined) delete process.env.TZ;
      else process.env.TZ = antes;
    }
  });
});

import { describe, expect, it } from "vitest";
import { fmtHoras, formatarPrazoRelativo, formatarResultadoSla } from "./sla-format";

describe("formatarPrazoRelativo", () => {
  const agora = new Date("2026-08-12T12:00:00");

  it("mostra minutos quando falta menos de 1h", () => {
    const alvo = new Date("2026-08-12T12:18:00");
    expect(formatarPrazoRelativo(alvo, agora)).toBe("vence em 18min");
  });

  it("mostra minutos quando já venceu há menos de 1h", () => {
    const alvo = new Date("2026-08-12T11:42:00");
    expect(formatarPrazoRelativo(alvo, agora)).toBe("vencido há 18min");
  });

  it("mostra hora e minuto quando falta 1h ou mais", () => {
    const alvo = new Date("2026-08-12T15:12:00");
    expect(formatarPrazoRelativo(alvo, agora)).toBe("vence em 3h 12min");
  });

  it("arredonda pra 1h em vez de 60min no limite de 1h", () => {
    const alvo = new Date(agora.getTime() + 59.999 * 60 * 1000);
    expect(formatarPrazoRelativo(alvo, agora)).toBe("vence em 1h");
  });

  it("mostra dias quando passa de 48h", () => {
    const alvo = new Date("2026-08-15T12:00:00");
    expect(formatarPrazoRelativo(alvo, agora)).toBe("vence em 3.0d");
  });
});

describe("fmtHoras", () => {
  it("mostra só minutos abaixo de 1h", () => {
    expect(fmtHoras(0.3)).toBe("18min");
  });

  it("mostra hora cheia sem minutos quando não sobra resto", () => {
    expect(fmtHoras(6)).toBe("6h");
  });

  it("combina hora e minuto quando sobra resto", () => {
    expect(fmtHoras(6.7)).toBe("6h 42min");
  });

  it("vira dias a partir de 48h", () => {
    expect(fmtHoras(72)).toBe("3.0d");
  });

  it("retorna travessão pra null", () => {
    expect(fmtHoras(null)).toBe("—");
  });
});

describe("formatarResultadoSla", () => {
  const vencimento = new Date("2026-08-12T14:00:00");

  it("finalizado antes do prazo, com folga", () => {
    const finalizadoEm = new Date("2026-08-12T12:00:00");
    expect(formatarResultadoSla(finalizadoEm, vencimento)).toBe("finalizado 2h antes do prazo");
  });

  it("finalizado depois do prazo, com atraso", () => {
    const finalizadoEm = new Date("2026-08-12T15:30:00");
    expect(formatarResultadoSla(finalizadoEm, vencimento)).toBe("finalizado 1h 30min após o prazo");
  });
});

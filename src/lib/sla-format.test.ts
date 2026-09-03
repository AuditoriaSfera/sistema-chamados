import { describe, expect, it } from "vitest";
import { formatarPrazoRelativo } from "./sla-format";

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

  it("mostra horas quando falta 1h ou mais", () => {
    const alvo = new Date("2026-08-12T15:12:00");
    expect(formatarPrazoRelativo(alvo, agora)).toBe("vence em 3.2h");
  });

  it("arredonda pra 1.0h em vez de 60min no limite de 1h", () => {
    const alvo = new Date(agora.getTime() + 59.999 * 60 * 1000);
    expect(formatarPrazoRelativo(alvo, agora)).toBe("vence em 1.0h");
  });

  it("mostra dias quando passa de 48h", () => {
    const alvo = new Date("2026-08-15T12:00:00");
    expect(formatarPrazoRelativo(alvo, agora)).toBe("vence em 3.0d");
  });
});

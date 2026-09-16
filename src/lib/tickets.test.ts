import { describe, expect, it, vi } from "vitest";
import type { PdvCalendar, PdvDiaHorario } from "./business-calendar";

// tickets.ts importa `prisma` de "@/lib/db" no topo do arquivo (usado por
// outras exports, não por slaVencimentoEfetivo, que é pura) — sem o mock,
// só importar o módulo já falhava aqui por falta de DATABASE_URL no ambiente
// de teste.
vi.mock("@/lib/db", () => ({ prisma: {} }));

const { slaVencimentoEfetivo } = await import("./tickets");

// 2026-08-12 é quarta-feira; 13=quinta, 14=sexta, 15=sábado, 16=domingo, 17=segunda.
const diasUteis: PdvDiaHorario[] = [1, 2, 3, 4, 5].map((diaSemana) => ({
  diaSemana,
  abre: true,
  horarioInicio: "08:00",
  horarioFim: "18:00",
}));
const fimDeSemanaFechado: PdvDiaHorario[] = [0, 6].map((diaSemana) => ({
  diaSemana,
  abre: false,
  horarioInicio: "00:00",
  horarioFim: "00:00",
}));
const calPadrao: PdvCalendar = { horarios: [...diasUteis, ...fimDeSemanaFechado], feriados: [] };

function d(iso: string) {
  return new Date(iso);
}

describe("slaVencimentoEfetivo", () => {
  const slaOriginal = d("2026-08-20T18:00:00");

  it("sem slaVencimentoEm, retorna null", () => {
    expect(
      slaVencimentoEfetivo({ slaVencimentoEm: null, pausaSlaDesde: null }, 5, d("2026-08-12T10:00:00"), calPadrao)
    ).toBeNull();
  });

  it("sem pausaSlaDesde, retorna o vencimento original sem alterar", () => {
    const resultado = slaVencimentoEfetivo(
      { slaVencimentoEm: slaOriginal, pausaSlaDesde: null },
      5,
      d("2026-08-12T10:00:00"),
      calPadrao
    );
    expect(resultado).toEqual(slaOriginal);
  });

  it("pausaSlaDesde setado mas status sem pausaSlaDiasUteis configurado, ignora a pausa", () => {
    const resultado = slaVencimentoEfetivo(
      { slaVencimentoEm: slaOriginal, pausaSlaDesde: d("2026-08-12T10:00:00") },
      null,
      d("2026-08-14T10:00:00"),
      calPadrao
    );
    expect(resultado).toEqual(slaOriginal);
  });

  it("pausado dentro da janela de dias úteis: desloca exatamente o tempo já decorrido, congelando o restante", () => {
    const pausaDesde = d("2026-08-12T10:00:00"); // quarta
    const agora = d("2026-08-13T15:00:00"); // quinta, 29h depois
    const resultado = slaVencimentoEfetivo(
      { slaVencimentoEm: slaOriginal, pausaSlaDesde: pausaDesde },
      5,
      agora,
      calPadrao
    )!;
    const deslocamentoMs = agora.getTime() - pausaDesde.getTime();
    expect(resultado.getTime()).toBe(slaOriginal.getTime() + deslocamentoMs);
    // o "restante" até o vencimento efetivo, visto de `agora`, é o mesmo que
    // era visto de `pausaSlaDesde` antes de pausar — o SLA ficou congelado.
    expect(resultado.getTime() - agora.getTime()).toBe(slaOriginal.getTime() - pausaDesde.getTime());
  });

  it("pausado além do teto de dias úteis: o deslocamento para de crescer (SLA volta a contar sozinho)", () => {
    const pausaDesde = d("2026-08-12T10:00:00"); // quarta
    // teto de 2 dias úteis a partir de quarta 10h: quinta(1) sexta(2) -> teto = sexta 10h.
    const depoisDoTeto1 = d("2026-08-16T09:00:00"); // domingo
    const depoisDoTeto2 = d("2026-08-20T09:00:00"); // quinta seguinte, bem depois

    const resultado1 = slaVencimentoEfetivo(
      { slaVencimentoEm: slaOriginal, pausaSlaDesde: pausaDesde },
      2,
      depoisDoTeto1,
      calPadrao
    )!;
    const resultado2 = slaVencimentoEfetivo(
      { slaVencimentoEm: slaOriginal, pausaSlaDesde: pausaDesde },
      2,
      depoisDoTeto2,
      calPadrao
    )!;

    // uma vez passado o teto, o vencimento efetivo fica fixo (não cresce mais
    // com `agora`) — os dois instantes diferentes dão o mesmo resultado.
    expect(resultado1.getTime()).toBe(resultado2.getTime());
    const tetoEsperado = d("2026-08-14T10:00:00"); // sexta 10h
    const deslocamentoEsperadoMs = tetoEsperado.getTime() - pausaDesde.getTime();
    expect(resultado1.getTime()).toBe(slaOriginal.getTime() + deslocamentoEsperadoMs);
  });
});

import { describe, expect, it } from "vitest";
import {
  addBusinessMinutes,
  businessMinutesBetween,
  parseLocalDate,
  type PdvCalendar,
  type PdvDiaHorario,
} from "./business-calendar";

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
const calPadrao: PdvCalendar = {
  horarios: [...diasUteis, ...fimDeSemanaFechado],
  feriados: [],
};

function d(iso: string) {
  return new Date(iso);
}

describe("parseLocalDate", () => {
  it("interpreta YYYY-MM-DD como meia-noite local, não UTC", () => {
    const date = parseLocalDate("2026-08-13");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7); // agosto, 0-indexado
    expect(date.getDate()).toBe(13);
    expect(date.getHours()).toBe(0);
  });
});

describe("addBusinessMinutes", () => {
  it("soma dentro do mesmo dia quando cabe na janela", () => {
    const from = d("2026-08-12T10:00:00");
    const result = addBusinessMinutes(from, 120, calPadrao);
    expect(result).toEqual(d("2026-08-12T12:00:00"));
  });

  it("transborda pro próximo dia útil quando passa do fim do expediente", () => {
    const from = d("2026-08-12T17:00:00"); // quarta, 1h até as 18h
    const result = addBusinessMinutes(from, 180, calPadrao); // 3h totais
    // usa 1h na quarta, sobra 2h -> quinta 08:00 + 2h = 10:00
    expect(result).toEqual(d("2026-08-13T10:00:00"));
  });

  it("pula fim de semana", () => {
    const from = d("2026-08-14T17:00:00"); // sexta, 1h até as 18h
    const result = addBusinessMinutes(from, 180, calPadrao);
    // usa 1h na sexta, sobra 2h -> pula sáb/dom -> segunda 08:00 + 2h = 10:00
    expect(result).toEqual(d("2026-08-17T10:00:00"));
  });

  it("pula feriado cadastrado pro PDV", () => {
    const calComFeriado: PdvCalendar = {
      ...calPadrao,
      feriados: [parseLocalDate("2026-08-13")], // quinta
    };
    const from = d("2026-08-12T13:26:00"); // quarta
    const result = addBusinessMinutes(from, 720, calComFeriado); // 12h de SLA
    // quarta: 13:26-18:00 = 4h34 (274min) usados, sobra 446min
    // quinta é feriado, pula pra sexta 08:00 + 446min = 15:26
    expect(result).toEqual(d("2026-08-14T15:26:00"));
  });

  it("respeita horário de início quando from cai antes do expediente", () => {
    const from = d("2026-08-12T05:00:00"); // quarta de madrugada
    const result = addBusinessMinutes(from, 60, calPadrao);
    expect(result).toEqual(d("2026-08-12T09:00:00"));
  });
});

describe("businessMinutesBetween", () => {
  it("conta só os minutos dentro da janela quando cabe no mesmo dia", () => {
    const minutos = businessMinutesBetween(
      d("2026-08-12T10:00:00"),
      d("2026-08-12T12:00:00"),
      calPadrao
    );
    expect(minutos).toBe(120);
  });

  it("soma através de uma noite não útil", () => {
    const minutos = businessMinutesBetween(
      d("2026-08-12T17:00:00"), // quarta, 1h até as 18h
      d("2026-08-13T10:00:00"), // quinta, 2h desde as 08h
      calPadrao
    );
    expect(minutos).toBe(180);
  });

  it("pula fim de semana fechado", () => {
    const minutos = businessMinutesBetween(
      d("2026-08-14T17:00:00"), // sexta, 1h até as 18h
      d("2026-08-17T10:00:00"), // segunda, 2h desde as 08h
      calPadrao
    );
    expect(minutos).toBe(180);
  });

  it("pula feriado cadastrado pro PDV — é o inverso exato de addBusinessMinutes", () => {
    const calComFeriado: PdvCalendar = {
      ...calPadrao,
      feriados: [parseLocalDate("2026-08-13")], // quinta
    };
    const minutos = businessMinutesBetween(
      d("2026-08-12T13:26:00"), // quarta
      d("2026-08-14T15:26:00"), // sexta
      calComFeriado
    );
    expect(minutos).toBe(720); // 12h, mesmo prazo usado no teste equivalente de addBusinessMinutes
  });

  it("respeita horário diferente num dia específico da semana (sábado)", () => {
    const calComSabadoAberto: PdvCalendar = {
      horarios: [
        ...diasUteis,
        { diaSemana: 6, abre: true, horarioInicio: "09:00", horarioFim: "13:00" }, // sábado
        { diaSemana: 0, abre: false, horarioInicio: "00:00", horarioFim: "00:00" }, // domingo
      ],
      feriados: [],
    };
    const minutos = businessMinutesBetween(
      d("2026-08-14T17:00:00"), // sexta, 1h até as 18h
      d("2026-08-15T11:00:00"), // sábado, 2h desde as 09h
      calComSabadoAberto
    );
    expect(minutos).toBe(180);
  });
});

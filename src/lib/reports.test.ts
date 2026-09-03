import { describe, expect, it } from "vitest";
import {
  classificarSla,
  slaStats,
  taxaReaberturaGeral,
  tempoMedioResolucaoGeral,
  type CalendarioPorPdv,
  type ChamadoReportRow,
} from "./reports";

const semCalendario: CalendarioPorPdv = new Map();

function chamado(overrides: Partial<ChamadoReportRow>): ChamadoReportRow {
  return {
    id: "c1",
    numero: 1,
    status: "ABERTO",
    slaPreset: { id: "p-normal", nome: "Normal", cor: "slate", critica: false },
    subMotivoFinalizacao: null,
    createdAt: new Date("2026-08-10T10:00:00"),
    finalizadoEm: null,
    slaVencimentoEm: null,
    motivoReabertura: null,
    pdv: { id: "pdv1", codigo: "PDV1", nome: "Loja 1" },
    servico: { nome: "Atraso na entrega" },
    pedido: { numero: "PED-1", nomeCliente: "Cliente A" },
    abertoPor: { id: "u1", nome: "Solicitante" },
    responsavel: null,
    mensagens: [],
    ...overrides,
  };
}

describe("classificarSla", () => {
  const now = new Date("2026-08-12T12:00:00");

  it("retorna null pra chamado finalizado (SLA já resolvido, não monitora mais)", () => {
    const c = chamado({ status: "FINALIZADO", slaVencimentoEm: new Date("2026-08-11T12:00:00") });
    expect(classificarSla(c, now)).toBeNull();
  });

  it("retorna null quando não há SLA definido", () => {
    const c = chamado({ status: "ABERTO", slaVencimentoEm: null });
    expect(classificarSla(c, now)).toBeNull();
  });

  it("retorna 'vencido' quando o prazo já passou e o chamado segue aberto", () => {
    const c = chamado({ status: "ABERTO", slaVencimentoEm: new Date("2026-08-11T12:00:00") });
    expect(classificarSla(c, now)).toBe("vencido");
  });

  it("retorna 'risco' quando restam ≤20% do prazo original", () => {
    const c = chamado({
      status: "EM_ANDAMENTO",
      createdAt: new Date("2026-08-12T00:00:00"),
      slaVencimentoEm: new Date("2026-08-12T13:00:00"), // prazo de 13h, restam ~1h (<20%)
    });
    expect(classificarSla(c, now)).toBe("risco");
  });

  it("retorna 'ok' quando ainda falta bastante prazo", () => {
    const c = chamado({
      status: "EM_ANDAMENTO",
      createdAt: new Date("2026-08-12T00:00:00"),
      slaVencimentoEm: new Date("2026-08-13T00:00:00"), // prazo de 24h, muito tempo restante
    });
    expect(classificarSla(c, now)).toBe("ok");
  });
});

describe("slaStats", () => {
  const now = new Date("2026-08-12T12:00:00");

  it("conta cumprido quando finalizadoEm <= slaVencimentoEm", () => {
    const c = chamado({
      status: "FINALIZADO",
      finalizadoEm: new Date("2026-08-11T10:00:00"),
      slaVencimentoEm: new Date("2026-08-11T12:00:00"),
    });
    const stats = slaStats([c], now);
    expect(stats.cumpridos).toBe(1);
    expect(stats.vencidos).toBe(0);
  });

  it("conta vencido quando finalizadoEm > slaVencimentoEm", () => {
    const c = chamado({
      status: "FINALIZADO",
      finalizadoEm: new Date("2026-08-11T14:00:00"),
      slaVencimentoEm: new Date("2026-08-11T12:00:00"),
    });
    const stats = slaStats([c], now);
    expect(stats.vencidos).toBe(1);
    expect(stats.cumpridos).toBe(0);
  });

  it("ignora chamados cancelados no cálculo de cumprido/vencido", () => {
    const c = chamado({ status: "CANCELADO", slaVencimentoEm: new Date("2026-08-11T12:00:00") });
    const stats = slaStats([c], now);
    expect(stats.cumpridos).toBe(0);
    expect(stats.vencidos).toBe(0);
    expect(stats.total).toBe(1);
  });

  // Regressão: um chamado ainda aberto (não vencido) diluía o cumpridoPct
  // geral mesmo sem nenhum vencido — cumpridoPctFinalizados isola só quem já
  // foi resolvido, então não cai só porque a fila cresceu.
  it("cumpridoPctFinalizados não é diluído por chamado ainda em aberto", () => {
    const finalizadoNoPrazo = chamado({
      status: "FINALIZADO",
      finalizadoEm: new Date("2026-08-11T10:00:00"),
      slaVencimentoEm: new Date("2026-08-11T12:00:00"),
    });
    const aindaAberto = chamado({
      status: "EM_ANDAMENTO",
      createdAt: new Date("2026-08-12T00:00:00"),
      slaVencimentoEm: new Date("2026-08-13T00:00:00"), // bem dentro do prazo, não vencido
    });
    const stats = slaStats([finalizadoNoPrazo, aindaAberto], now);
    expect(stats.cumpridoPct).toBe(50); // diluído pelo chamado em aberto
    expect(stats.cumpridoPctFinalizados).toBe(100); // só considera quem já foi resolvido
    expect(stats.finalizadosComSla).toBe(1);
  });

  it("cumpridoPctFinalizados conta finalizado fora do prazo, mas não o ainda aberto e vencido", () => {
    const finalizadoAtrasado = chamado({
      status: "FINALIZADO",
      finalizadoEm: new Date("2026-08-11T14:00:00"),
      slaVencimentoEm: new Date("2026-08-11T12:00:00"),
    });
    const abertoEVencido = chamado({
      status: "EM_ANDAMENTO",
      createdAt: new Date("2026-08-10T00:00:00"),
      slaVencimentoEm: new Date("2026-08-11T00:00:00"), // já passou, mas nunca foi finalizado
    });
    const stats = slaStats([finalizadoAtrasado, abertoEVencido], now);
    expect(stats.vencidos).toBe(2); // ambos contam pro vencido geral
    expect(stats.finalizadosComSla).toBe(1); // só o finalizado entra na base
    expect(stats.cumpridoPctFinalizados).toBe(0);
  });
});

describe("tempoMedioResolucaoGeral", () => {
  it("não conta chamado reaberto como resolvido mesmo com finalizadoEm setado", () => {
    // motivoReabertura fica preenchido e finalizadoEm continua com o valor antigo
    // depois que o chamado é reaberto — só deve contar pra tempo de resolução
    // quem está com status FINALIZADO agora.
    const c = chamado({
      status: "REABERTO",
      motivoReabertura: "Cliente reclamou de novo",
      createdAt: new Date("2026-08-10T10:00:00"),
      finalizadoEm: new Date("2026-08-10T12:00:00"),
    });
    expect(tempoMedioResolucaoGeral([c], semCalendario)).toBeNull();
  });

  it("conta chamado finalizado normalmente (horas corridas, sem calendário útil configurado)", () => {
    const c = chamado({
      status: "FINALIZADO",
      createdAt: new Date("2026-08-10T10:00:00"),
      finalizadoEm: new Date("2026-08-10T14:00:00"),
    });
    expect(tempoMedioResolucaoGeral([c], semCalendario)?.totalHoras).toBe(4);
  });
});

describe("taxaReaberturaGeral", () => {
  it("calcula percentual de chamados com motivoReabertura preenchido", () => {
    const chamados = [
      chamado({ motivoReabertura: "motivo 1" }),
      chamado({ motivoReabertura: null }),
      chamado({ motivoReabertura: null }),
      chamado({ motivoReabertura: null }),
    ];
    expect(taxaReaberturaGeral(chamados)).toBe(25);
  });

  it("retorna 0 quando não há chamados", () => {
    expect(taxaReaberturaGeral([])).toBe(0);
  });
});

export type PdvDiaHorario = {
  diaSemana: number; // 0=domingo..6=sábado
  abre: boolean;
  horarioInicio: string; // "HH:MM"
  horarioFim: string; // "HH:MM"
};

export type PdvCalendar = {
  horarios: PdvDiaHorario[]; // um por dia da semana
  feriados: Date[]; // apenas a data (sem hora) de cada feriado
};

/**
 * Fuso fixo pra todo o cálculo de horário útil — o horário de funcionamento do PDV
 * ("das 9h às 18h") é sempre horário de Brasília, mas o servidor (Railway) roda em
 * UTC. Ler hora/dia-da-semana com `Date.prototype.getHours`/`getDay` usaria o fuso
 * do runtime, não o de Brasília, e deslocaria a janela de expediente em até 3h —
 * era exatamente esse o bug: chamado tratado como vencido cedo demais porque o
 * "fim do expediente" (18h) batia com 18h UTC, não 18h de Brasília. Toda leitura e
 * escrita de data neste arquivo passa pelas duas funções abaixo, nunca pelos
 * getters/setters locais do runtime. Mesmo fuso usado pra exibição em datas.ts.
 */
const FUSO = "America/Sao_Paulo";

/** Lê ano/mês/dia/hora/minuto/dia-da-semana de um instante, no fuso `timeZone` — não no fuso do runtime. */
function getZonedParts(date: Date, timeZone: string) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  const DIA_SEMANA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(valor("year")),
    month: Number(valor("month")),
    day: Number(valor("day")),
    hour: Number(valor("hour")) % 24, // ICU às vezes formata meia-noite como "24"
    minute: Number(valor("minute")),
    weekday: DIA_SEMANA[valor("weekday")] ?? 0,
  };
}

/** Constrói o instante UTC correspondente a um horário de parede (ano/mês/dia/hora/min) no fuso `timeZone`. */
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const chuteUtc = Date.UTC(year, month - 1, day, hour, minute);
  const comoZoned = getZonedParts(new Date(chuteUtc), timeZone);
  const zonedComoUtc = Date.UTC(comoZoned.year, comoZoned.month - 1, comoZoned.day, comoZoned.hour, comoZoned.minute);
  return new Date(chuteUtc + (chuteUtc - zonedComoUtc));
}

/**
 * Parseia "YYYY-MM-DD" como meia-noite de Brasília, não do fuso do runtime — grava
 * sempre o mesmo instante independente de rodar no servidor (UTC) ou localmente.
 */
export function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return zonedTimeToUtc(y, m ?? 1, d ?? 1, 0, 0, FUSO);
}

function parseHora(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function atTime(date: Date, hhmm: string) {
  const { h, m } = parseHora(hhmm);
  const { year, month, day } = getZonedParts(date, FUSO);
  return zonedTimeToUtc(year, month, day, h, m, FUSO);
}

function startOfNextDay(date: Date) {
  const { year, month, day } = getZonedParts(date, FUSO);
  // Date.UTC normaliza dia=32 pro dia certo do mês seguinte, então dá pra somar 1
  // direto sem tratar virada de mês/ano à mão.
  const amanha = new Date(Date.UTC(year, month - 1, day + 1));
  return zonedTimeToUtc(amanha.getUTCFullYear(), amanha.getUTCMonth() + 1, amanha.getUTCDate(), 0, 0, FUSO);
}

function isMesmoDia(a: Date, b: Date) {
  const pa = getZonedParts(a, FUSO);
  const pb = getZonedParts(b, FUSO);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

function horarioDoDia(date: Date, cal: PdvCalendar) {
  return cal.horarios.find((h) => h.diaSemana === getZonedParts(date, FUSO).weekday);
}

function isDiaUtil(date: Date, cal: PdvCalendar) {
  const horario = horarioDoDia(date, cal);
  if (!horario || !horario.abre) return false;
  if (cal.feriados.some((f) => isMesmoDia(f, date))) return false;
  return true;
}

/**
 * Soma minutos de horário útil a partir de `from`, pulando dias fechados/feriados e
 * recortando para a janela horarioInicio–horarioFim configurada para cada dia da semana.
 */
export function addBusinessMinutes(from: Date, totalMinutes: number, cal: PdvCalendar): Date {
  let restante = totalMinutes;
  let cursor = new Date(from);

  // segurança contra configuração inconsistente (ex: nenhum dia útil)
  let iteracoes = 0;
  const MAX_ITERACOES = 3650; // ~10 anos de dias, suficiente como teto de segurança

  while (restante > 0) {
    iteracoes++;
    if (iteracoes > MAX_ITERACOES) return cursor;

    if (!isDiaUtil(cursor, cal)) {
      cursor = startOfNextDay(cursor);
      continue;
    }

    const horario = horarioDoDia(cursor, cal)!;
    const inicioJanela = atTime(cursor, horario.horarioInicio);
    const fimJanela = atTime(cursor, horario.horarioFim);

    if (cursor < inicioJanela) cursor = inicioJanela;
    if (cursor >= fimJanela) {
      cursor = startOfNextDay(cursor);
      continue;
    }

    const disponivelMin = (fimJanela.getTime() - cursor.getTime()) / 60000;
    if (disponivelMin >= restante) {
      cursor = new Date(cursor.getTime() + restante * 60000);
      restante = 0;
    } else {
      restante -= disponivelMin;
      cursor = startOfNextDay(cursor);
    }
  }

  return cursor;
}

/**
 * Soma os minutos de horário útil decorridos entre `from` e `to` (exclusive), pulando
 * dias fechados/feriados e considerando só a janela horarioInicio–horarioFim de cada dia.
 */
export function businessMinutesBetween(from: Date, to: Date, cal: PdvCalendar): number {
  if (to <= from) return 0;

  let minutos = 0;
  let cursor = new Date(from);

  let iteracoes = 0;
  const MAX_ITERACOES = 3650;

  while (cursor < to) {
    iteracoes++;
    if (iteracoes > MAX_ITERACOES) return minutos;

    const fimDia = startOfNextDay(cursor);
    const limiteDoDia = to < fimDia ? to : fimDia;

    if (isDiaUtil(cursor, cal)) {
      const horario = horarioDoDia(cursor, cal)!;
      const inicioJanela = atTime(cursor, horario.horarioInicio);
      const fimJanela = atTime(cursor, horario.horarioFim);

      const inicioEfetivo = cursor < inicioJanela ? inicioJanela : cursor;
      const fimEfetivo = limiteDoDia < fimJanela ? limiteDoDia : fimJanela;

      if (fimEfetivo > inicioEfetivo) {
        minutos += (fimEfetivo.getTime() - inicioEfetivo.getTime()) / 60000;
      }
    }

    cursor = fimDia;
  }

  return minutos;
}

/** Meia-noite (fuso de Brasília) do dia de `date`. */
function inicioDoDia(date: Date): Date {
  const { year, month, day } = getZonedParts(date, FUSO);
  return zonedTimeToUtc(year, month, day, 0, 0, FUSO);
}

/**
 * Dia útil pra CONTAGEM de dias em aberto — diferente de isDiaUtil(): aqui
 * sábado e domingo nunca contam, mesmo que o PDV tenha horário de
 * funcionamento cadastrado pra esses dias (loja que abre sábado de manhã,
 * por exemplo). isDiaUtil() respeita esse horário de propósito pros cálculos
 * de prazo em HORAS (addBusinessMinutes/businessMinutesBetween); a regra de
 * "dias em aberto" pedida é fim de semana/feriado nunca contam, ponto —
 * independente do horário cadastrado.
 */
function isDiaUtilParaContagemDeDias(date: Date, cal: PdvCalendar): boolean {
  const diaSemana = getZonedParts(date, FUSO).weekday;
  if (diaSemana === 0 || diaSemana === 6) return false;
  if (cal.feriados.some((f) => isMesmoDia(f, date))) return false;
  return true;
}

/**
 * Dias úteis decorridos desde a abertura, contando "hoje" como o Dia 0 —
 * cresce só quando o dia seguinte é útil (não é sábado, domingo nem feriado
 * do PDV). Se `from` cair num fim de semana/feriado, a contagem só começa a
 * subir no primeiro dia útil depois dele, não no dia seguinte a `from`.
 */
export function diasUteisDesdeAbertura(from: Date, agora: Date, cal: PdvCalendar): number {
  const hojeInicio = inicioDoDia(agora);
  let cursor = inicioDoDia(from);
  let dias = 0;

  let iteracoes = 0;
  const MAX_ITERACOES = 3650;

  while (cursor.getTime() < hojeInicio.getTime()) {
    iteracoes++;
    if (iteracoes > MAX_ITERACOES) return dias;

    cursor = startOfNextDay(cursor);
    if (isDiaUtilParaContagemDeDias(cursor, cal)) dias++;
  }

  return dias;
}

/** Mesmo instante do dia seguinte (hora/minuto preservados), no fuso de Brasília. */
function addOneDayPreservingTime(date: Date): Date {
  const { year, month, day, hour, minute } = getZonedParts(date, FUSO);
  const amanha = new Date(Date.UTC(year, month - 1, day + 1));
  return zonedTimeToUtc(amanha.getUTCFullYear(), amanha.getUTCMonth() + 1, amanha.getUTCDate(), hour, minute, FUSO);
}

/**
 * Soma `dias` dias úteis a `from`, na mesma regra de isDiaUtilParaContagemDeDias
 * (pula sábado/domingo/feriado, ignora horário cadastrado do PDV) — o inverso
 * de diasUteisDesdeAbertura(): em vez de contar dias já passados, avança pra
 * frente até completar `dias` dias úteis, preservando a hora do dia de `from`.
 * Usada pra calcular até quando uma pausa de SLA (ex.: status "Resolvido
 * (ressalvas)") vale, em src/lib/tickets.ts.
 */
export function addDiasUteis(from: Date, dias: number, cal: PdvCalendar): Date {
  let cursor = from;
  let restantes = dias;

  let iteracoes = 0;
  const MAX_ITERACOES = 3650;

  while (restantes > 0) {
    iteracoes++;
    if (iteracoes > MAX_ITERACOES) return cursor;

    cursor = addOneDayPreservingTime(cursor);
    if (isDiaUtilParaContagemDeDias(cursor, cal)) restantes--;
  }

  return cursor;
}

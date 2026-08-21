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
 * Parseia "YYYY-MM-DD" como meia-noite no fuso local, não UTC — `new Date("YYYY-MM-DD")`
 * é sempre UTC e pode virar o dia anterior/seguinte dependendo do fuso do servidor.
 */
export function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function parseHora(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function atTime(date: Date, hhmm: string) {
  const { h, m } = parseHora(hhmm);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function startOfNextDay(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isMesmoDia(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function horarioDoDia(date: Date, cal: PdvCalendar) {
  return cal.horarios.find((h) => h.diaSemana === date.getDay());
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

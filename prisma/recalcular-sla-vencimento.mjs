/**
 * Recalcula "Chamado.slaVencimentoEm" dos chamados ainda em aberto, corrigindo o
 * bug de fuso horário do cálculo de horário útil: até agora, o motor de cálculo
 * lia hora/dia-da-semana com Date.getHours()/getDay(), que usam o fuso do
 * RUNTIME — e o container do Railway roda em UTC, não em horário de Brasília.
 * Resultado: o expediente do PDV (ex.: "09:00–18:00") era lido 3h adiantado, e o
 * prazo de SLA vencia cedo demais pra todo chamado calculado em produção.
 *
 * A correção do cálculo já foi feita em src/lib/business-calendar.ts (fuso
 * fixado em "America/Sao_Paulo"). Este script só corrige o dado que já ficou
 * gravado errado: recalcula "slaVencimentoEm" de todo chamado ainda não
 * finalizado/cancelado, usando o mesmo cálculo (reimplementado aqui em JS puro,
 * sem depender do build da aplicação — mesmo padrão de aplicar-dados.mjs/
 * criar-admin.mjs).
 *
 * Chamados finalizados/cancelados não são tocados: o SLA deles já foi decidido
 * e os relatórios olham finalizadoEm, não slaVencimentoEm.
 *
 * Idempotente: rodar de novo não muda nada (recalcula os mesmos chamados pro
 * mesmo resultado, e só faz UPDATE quando o valor realmente muda).
 *
 *   DATABASE_URL="postgresql://..." node prisma/recalcular-sla-vencimento.mjs
 *
 * No Railway dá pra rodar direto pelo Console do serviço (aba Console): o
 * DATABASE_URL já está no ambiente do container.
 *
 *   node prisma/recalcular-sla-vencimento.mjs
 *
 * Use --dry-run pra só listar o que mudaria, sem gravar nada.
 */
import pg from "pg";

const DRY_RUN = process.argv.includes("--dry-run");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

const FUSO = "America/Sao_Paulo";

function getZonedParts(date, timeZone) {
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
  const valor = (tipo) => partes.find((p) => p.type === tipo)?.value ?? "";
  const DIA_SEMANA = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(valor("year")),
    month: Number(valor("month")),
    day: Number(valor("day")),
    hour: Number(valor("hour")) % 24,
    minute: Number(valor("minute")),
    weekday: DIA_SEMANA[valor("weekday")] ?? 0,
  };
}

function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  const chuteUtc = Date.UTC(year, month - 1, day, hour, minute);
  const comoZoned = getZonedParts(new Date(chuteUtc), timeZone);
  const zonedComoUtc = Date.UTC(comoZoned.year, comoZoned.month - 1, comoZoned.day, comoZoned.hour, comoZoned.minute);
  return new Date(chuteUtc + (chuteUtc - zonedComoUtc));
}

function parseHora(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function atTime(date, hhmm) {
  const { h, m } = parseHora(hhmm);
  const { year, month, day } = getZonedParts(date, FUSO);
  return zonedTimeToUtc(year, month, day, h, m, FUSO);
}

function startOfNextDay(date) {
  const { year, month, day } = getZonedParts(date, FUSO);
  const amanha = new Date(Date.UTC(year, month - 1, day + 1));
  return zonedTimeToUtc(amanha.getUTCFullYear(), amanha.getUTCMonth() + 1, amanha.getUTCDate(), 0, 0, FUSO);
}

function isMesmoDia(a, b) {
  const pa = getZonedParts(a, FUSO);
  const pb = getZonedParts(b, FUSO);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

function horarioDoDia(date, cal) {
  return cal.horarios.find((h) => h.diaSemana === getZonedParts(date, FUSO).weekday);
}

function isDiaUtil(date, cal) {
  const horario = horarioDoDia(date, cal);
  if (!horario || !horario.abre) return false;
  if (cal.feriados.some((f) => isMesmoDia(f, date))) return false;
  return true;
}

function addBusinessMinutes(from, totalMinutes, cal) {
  let restante = totalMinutes;
  let cursor = new Date(from);
  let iteracoes = 0;
  const MAX_ITERACOES = 3650;

  while (restante > 0) {
    iteracoes++;
    if (iteracoes > MAX_ITERACOES) return cursor;

    if (!isDiaUtil(cursor, cal)) {
      cursor = startOfNextDay(cursor);
      continue;
    }

    const horario = horarioDoDia(cursor, cal);
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

function duracaoSlaEmHoras(duracao, unidade) {
  return unidade === "DIAS" ? duracao * 24 : duracao;
}

const client = new pg.Client({
  connectionString,
  ssl: /localhost|\.railway\.internal/.test(connectionString) ? false : { rejectUnauthorized: false },
});
await client.connect();

try {
  const { rows: chamados } = await client.query(`
    select c.id, c.numero, c."createdAt", c."slaVencimentoEm", c."pdvId",
           sp.duracao, sp.unidade
    from "Chamado" c
    join "Servico" s on s.id = c."servicoId"
    join "SlaPreset" sp on sp.id = s."slaPresetId"
    where c.status not in ('FINALIZADO', 'CANCELADO')
  `);

  console.log(`${chamados.length} chamado(s) em aberto encontrados.`);

  const cacheCalendario = new Map();
  async function calendarioDoPdv(pdvId) {
    if (cacheCalendario.has(pdvId)) return cacheCalendario.get(pdvId);
    const { rows: horarios } = await client.query(
      `select "diaSemana", abre, "horarioInicio", "horarioFim" from "PdvHorario" where "pdvId" = $1`,
      [pdvId]
    );
    const { rows: feriados } = await client.query(`select data from "Feriado" where "pdvId" = $1`, [pdvId]);
    const cal = { horarios, feriados: feriados.map((f) => f.data) };
    cacheCalendario.set(pdvId, cal);
    return cal;
  }

  let atualizados = 0;
  for (const c of chamados) {
    const { rows: reaberturas } = await client.query(
      `select "createdAt" from "StatusHistorico"
       where "chamadoId" = $1 and status = 'REABERTO'
       order by "createdAt" desc limit 1`,
      [c.id]
    );
    const from = reaberturas[0]?.createdAt ?? c.createdAt;

    const cal = await calendarioDoPdv(c.pdvId);
    if (!cal.horarios.length) continue; // PDV sem calendário configurado — mesmo fallback do computeSlaVencimento

    const prazoHoras = duracaoSlaEmHoras(c.duracao, c.unidade);
    const novoVencimento = addBusinessMinutes(from, prazoHoras * 60, cal);

    const antigo = c.slaVencimentoEm;
    if (antigo && Math.abs(antigo.getTime() - novoVencimento.getTime()) < 1000) continue; // já correto

    const diffMin = antigo ? Math.round((antigo.getTime() - novoVencimento.getTime()) / 60000) : null;
    console.log(
      `#${String(c.numero).padStart(4, "0")}: ${antigo?.toISOString() ?? "—"} -> ${novoVencimento.toISOString()}` +
        (diffMin !== null ? ` (${diffMin > 0 ? "-" : "+"}${Math.abs(diffMin)}min)` : "")
    );

    if (!DRY_RUN) {
      await client.query(`update "Chamado" set "slaVencimentoEm" = $2 where id = $1`, [c.id, novoVencimento]);
    }
    atualizados++;
  }

  console.log(
    DRY_RUN
      ? `\n${atualizados} chamado(s) seriam corrigidos (--dry-run, nada foi gravado).`
      : `\n${atualizados} chamado(s) corrigido(s).`
  );
} finally {
  await client.end();
}

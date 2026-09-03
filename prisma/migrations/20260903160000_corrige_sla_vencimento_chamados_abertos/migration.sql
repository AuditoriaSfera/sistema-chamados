-- Recalcula "Chamado.slaVencimentoEm" dos chamados ainda em aberto, gravados
-- com o valor errado pela migração anterior (20260903150000 corrigiu só o
-- CÁLCULO — src/lib/business-calendar.ts — pra próximos chamados; esta migração
-- corrige o DADO que já tinha sido gravado errado antes dessa correção de
-- código, quando o expediente do PDV era lido no fuso do servidor (UTC) em vez
-- de horário de Brasília).
--
-- Roda uma única vez (Prisma nunca reaplica uma migração já registrada).
-- Chamados finalizados/cancelados não são tocados: o SLA deles já foi
-- decidido e os relatórios olham finalizadoEm, não slaVencimentoEm.

CREATE OR REPLACE FUNCTION pg_temp.add_business_minutes(
  p_from TIMESTAMP,
  p_minutes INT,
  p_pdv_id TEXT
) RETURNS TIMESTAMP AS $$
DECLARE
  v_cursor TIMESTAMP := p_from;
  v_cursor_brt TIMESTAMP;
  v_restante INT := p_minutes;
  v_dow INT;
  v_horario RECORD;
  v_inicio_brt TIMESTAMP;
  v_fim_brt TIMESTAMP;
  v_inicio_utc TIMESTAMP;
  v_fim_utc TIMESTAMP;
  v_disponivel INT;
  v_iter INT := 0;
  v_is_feriado BOOLEAN;
BEGIN
  WHILE v_restante > 0 LOOP
    v_iter := v_iter + 1;
    IF v_iter > 3650 THEN RETURN v_cursor; END IF;

    v_cursor_brt := (v_cursor AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo';
    v_dow := EXTRACT(DOW FROM v_cursor_brt)::INT;

    SELECT abre, "horarioInicio", "horarioFim" INTO v_horario
    FROM "PdvHorario" WHERE "pdvId" = p_pdv_id AND "diaSemana" = v_dow;

    v_is_feriado := EXISTS (
      SELECT 1 FROM "Feriado"
      WHERE "pdvId" = p_pdv_id
        AND date_trunc('day', (data AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')
          = date_trunc('day', v_cursor_brt)
    );

    IF v_horario IS NULL OR NOT v_horario.abre OR v_is_feriado THEN
      v_cursor := ((date_trunc('day', v_cursor_brt) + interval '1 day') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC';
      CONTINUE;
    END IF;

    v_inicio_brt := date_trunc('day', v_cursor_brt) + v_horario."horarioInicio"::TIME;
    v_fim_brt := date_trunc('day', v_cursor_brt) + v_horario."horarioFim"::TIME;
    v_inicio_utc := (v_inicio_brt AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC';
    v_fim_utc := (v_fim_brt AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC';

    IF v_cursor < v_inicio_utc THEN v_cursor := v_inicio_utc; END IF;
    IF v_cursor >= v_fim_utc THEN
      v_cursor := ((date_trunc('day', v_cursor_brt) + interval '1 day') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC';
      CONTINUE;
    END IF;

    v_disponivel := (EXTRACT(EPOCH FROM (v_fim_utc - v_cursor)) / 60)::INT;
    IF v_disponivel >= v_restante THEN
      v_cursor := v_cursor + (v_restante || ' minutes')::interval;
      v_restante := 0;
    ELSE
      v_restante := v_restante - v_disponivel;
      v_cursor := ((date_trunc('day', v_cursor_brt) + interval '1 day') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC';
    END IF;
  END LOOP;

  RETURN v_cursor;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  r RECORD;
  v_from TIMESTAMP;
  v_prazo_horas NUMERIC;
  v_novo TIMESTAMP;
BEGIN
  FOR r IN
    SELECT c.id, c."createdAt", c."pdvId", c."slaVencimentoEm", sp.duracao, sp.unidade
    FROM "Chamado" c
    JOIN "Servico" s ON s.id = c."servicoId"
    JOIN "SlaPreset" sp ON sp.id = s."slaPresetId"
    WHERE c.status NOT IN ('FINALIZADO', 'CANCELADO')
  LOOP
    SELECT "createdAt" INTO v_from FROM "StatusHistorico"
    WHERE "chamadoId" = r.id AND status = 'REABERTO'
    ORDER BY "createdAt" DESC LIMIT 1;

    IF v_from IS NULL THEN
      v_from := r."createdAt";
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "PdvHorario" WHERE "pdvId" = r."pdvId") THEN
      CONTINUE;
    END IF;

    v_prazo_horas := CASE WHEN r.unidade = 'DIAS' THEN r.duracao * 24 ELSE r.duracao END;
    v_novo := pg_temp.add_business_minutes(v_from, (v_prazo_horas * 60)::INT, r."pdvId");

    IF r."slaVencimentoEm" IS NULL OR abs(extract(epoch from (r."slaVencimentoEm" - v_novo))) >= 1 THEN
      UPDATE "Chamado" SET "slaVencimentoEm" = v_novo WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

DROP FUNCTION pg_temp.add_business_minutes(TIMESTAMP, INT, TEXT);

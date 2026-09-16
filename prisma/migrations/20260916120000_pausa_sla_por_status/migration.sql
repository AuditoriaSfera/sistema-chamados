-- AlterTable
ALTER TABLE "Status" ADD COLUMN IF NOT EXISTS "pausaSlaDiasUteis" INTEGER;
ALTER TABLE "Chamado" ADD COLUMN IF NOT EXISTS "pausaSlaDesde" TIMESTAMP(3);

-- Ativa a pausa de 5 dias úteis pro status "Resolvido (ressalvas)", se ele já
-- existir (casamento por nome, igual à migration 20260908120000 -- não dá
-- pra validar contra produção antes de rodar). RAISE NOTICE deixa visível no
-- log do deploy quantas linhas bateram.
DO $$
DECLARE
  v_atualizados INT;
BEGIN
  UPDATE "Status"
  SET "pausaSlaDiasUteis" = 5
  WHERE nome ILIKE 'Resolvido (ressalvas)' AND "pausaSlaDiasUteis" IS NULL;
  GET DIAGNOSTICS v_atualizados = ROW_COUNT;
  RAISE NOTICE 'pausaSlaDiasUteis=5 aplicado em % status', v_atualizados;
END $$;

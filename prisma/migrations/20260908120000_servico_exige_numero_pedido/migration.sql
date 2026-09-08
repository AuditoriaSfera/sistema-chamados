-- AlterTable
ALTER TABLE "Servico" ADD COLUMN "exigeNumeroPedido" BOOLEAN NOT NULL DEFAULT true;

-- Serviços que não têm relação com um pedido específico -- abrir chamado
-- neles não deveria pedir número de pedido (fica gravado como "0").
-- RAISE NOTICE deixa visível no log do deploy quantas linhas bateram, já que
-- o casamento é por nome e não dá pra validar contra produção antes de rodar.
DO $$
DECLARE
  v_atualizados INT;
BEGIN
  UPDATE "Servico"
  SET "exigeNumeroPedido" = false
  WHERE nome ILIKE 'Alteração de dados cadastrais'
     OR nome ILIKE 'Analise de crédito (AUMENTO DE LIMITE)'
     OR nome ILIKE 'Analise de crédito (Revendedor sem Crédito)';
  GET DIAGNOSTICS v_atualizados = ROW_COUNT;
  RAISE NOTICE 'exigeNumeroPedido desativado em % serviço(s)', v_atualizados;
END $$;

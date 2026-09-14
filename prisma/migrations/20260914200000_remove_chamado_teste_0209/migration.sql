-- Remove o chamado #0209, aberto como teste (revendedor "Teste", código
-- "12334545") na loja de Juiz de Fora pra verificar se o sistema estava
-- funcionando. Mensagens, histórico de status e anexos são removidos junto
-- via ON DELETE CASCADE. O pedido vinculado só é removido se não sobrar
-- nenhum outro chamado usando ele (não deveria, era um pedido de teste).
--
-- Idempotente: se já não existir, não faz nada.
DO $$
DECLARE
  v_pedido_id TEXT;
BEGIN
  SELECT "pedidoId" INTO v_pedido_id FROM "Chamado" WHERE numero = 209;

  DELETE FROM "Chamado" WHERE numero = 209;

  IF v_pedido_id IS NOT NULL THEN
    DELETE FROM "Pedido"
    WHERE id = v_pedido_id
      AND NOT EXISTS (SELECT 1 FROM "Chamado" WHERE "pedidoId" = v_pedido_id);
  END IF;
END $$;

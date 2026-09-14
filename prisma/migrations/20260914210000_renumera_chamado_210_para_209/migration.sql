-- Depois de excluir o chamado teste #0209 (migração anterior), o chamado
-- #0210 vira #0209 pra fechar a sequência sem buraco. Só renumera se #0209
-- realmente não existir mais e #0210 existir; só recua o contador se ele
-- ainda estiver em 210 (ninguém abriu um chamado novo nesse meio-tempo) —
-- assim o próximo chamado aberto volta a ser #0210 naturalmente.
--
-- Idempotente: rodar de novo não faz nada (o "IF NOT EXISTS 209" deixa de
-- valer depois da primeira execução).
DO $$
DECLARE
  v_renumerado BOOLEAN := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Chamado" WHERE numero = 209)
     AND EXISTS (SELECT 1 FROM "Chamado" WHERE numero = 210) THEN
    UPDATE "Chamado" SET numero = 209 WHERE numero = 210;
    v_renumerado := true;
  END IF;

  IF v_renumerado THEN
    UPDATE "ChamadoContador" SET valor = 209 WHERE id = 'geral' AND valor = 210;
  END IF;
END $$;

-- Fecha o buraco que sobrou no número 210 (aberto novos chamados enquanto a
-- migração anterior rodava, o contador já tinha avançado e não pôde recuar
-- sozinho). Desloca pra baixo em 1 todo chamado com número > 209, fechando a
-- sequência de vez -- funciona pra quantos chamados existirem acima do
-- buraco no momento em que essa migração realmente rodar, não só os que
-- existiam quando ela foi escrita.
--
-- O deslocamento em dois passos (soma um valor bem acima de qualquer número
-- real, depois subtrai) evita colisão de número único no meio do caminho --
-- não dá pra simplesmente "numero = numero - 1" numa unica instrução porque
-- a ordem em que o Postgres processa as linhas não é garantida.
--
-- Idempotente: só roda se o número 210 realmente não existir e tiver algo
-- acima dele pra puxar pra baixo.
DO $$
DECLARE
  v_max INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Chamado" WHERE numero = 210)
     AND EXISTS (SELECT 1 FROM "Chamado" WHERE numero > 210) THEN

    UPDATE "Chamado" SET numero = numero + 1000000 WHERE numero > 209;
    UPDATE "Chamado" SET numero = numero - 1000001 WHERE numero > 1000000;

    SELECT max(numero) INTO v_max FROM "Chamado";
    UPDATE "ChamadoContador" SET valor = v_max WHERE id = 'geral' AND valor > v_max;
  END IF;
END $$;

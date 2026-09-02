-- Reverte a atribuição indevida do chamado #0002: alguém vinculado só a
-- outro PDV assumiu por engano, antes da correção de visibilidade por PDV
-- (migração 20260902200000) entrar no ar. Volta o chamado para "sem
-- responsável" e apaga a entrada correspondente da timeline, como se
-- ninguém tivesse assumido ainda — pronta pra próxima pessoa assumir.

UPDATE "Chamado" SET "responsavelId" = NULL WHERE numero = 2;

DELETE FROM "StatusHistorico"
 WHERE "chamadoId" = (SELECT id FROM "Chamado" WHERE numero = 2)
   AND texto = 'Chamado assumido.';

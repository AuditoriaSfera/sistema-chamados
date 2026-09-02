-- Limpeza pontual de chamados de teste: mantém só o último chamado aberto
-- (o #0016 no momento em que esta migração foi escrita) e apaga todos os
-- anteriores, renomeando o que sobrou para #0001 — o sistema volta a
-- numerar do zero para o uso real, sem descartar o chamado que já é de
-- produção de verdade.
--
-- As mensagens, anexos e histórico de status dos chamados apagados somem
-- junto (ON DELETE CASCADE já configurado nessas tabelas). Usuários,
-- PDVs, serviços, perfis, SLA, configurações e o log de auditoria não são
-- tocados.
--
-- Migração de dados, não de schema — roda uma única vez (o Prisma nunca
-- reaplica uma migração já registrada em "_prisma_migrations").

DELETE FROM "Chamado" WHERE numero <> 16;
DELETE FROM "Pedido" WHERE id NOT IN (SELECT "pedidoId" FROM "Chamado");
UPDATE "Chamado" SET numero = 1 WHERE numero = 16;
UPDATE "ChamadoContador" SET valor = 1 WHERE id = 'geral';

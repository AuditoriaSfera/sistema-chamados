-- Número de pedido passa a ser único por PDV, não globalmente. Até aqui, o
-- mesmo número de pedido não podia existir em mais de um PDV -- bloqueava
-- com "Esse número de pedido já existe vinculado a outro PDV.", mesmo sendo
-- um caso legítimo (pedidos diferentes, cada loja com o seu, que só
-- coincidem no número). "0" (serviço sem exigência de pedido) continua de
-- fora de qualquer unicidade, como já era.
DROP INDEX "Pedido_numero_key";
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero", "pdvId") WHERE "numero" <> '0';

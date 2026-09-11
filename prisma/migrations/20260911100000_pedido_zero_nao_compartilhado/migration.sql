-- Pedido "0" (usado por serviço sem exigência de número de pedido) deixa de
-- ser único: até aqui, TODO chamado desses serviços compartilhava o mesmo
-- registro de pedido "0", e cada abertura nova sobrescrevia o nome/código de
-- revendedor do registro inteiro — chamados de revendedores completamente
-- diferentes passavam a exibir o revendedor do chamado mais recente.
--
-- A unicidade de verdade (pedido com número real não pode repetir vinculado
-- a PDV diferente) continua valendo — só "0" fica de fora, via índice
-- parcial. Aplicativo passa a criar um registro de pedido novo por chamado
-- pra esses serviços, em vez de reaproveitar.
DROP INDEX "Pedido_numero_key";
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero") WHERE "numero" <> '0';

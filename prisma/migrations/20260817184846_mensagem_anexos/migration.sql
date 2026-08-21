ALTER TABLE "Anexo" ADD COLUMN "mensagemId" TEXT REFERENCES "Mensagem" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Anexo_mensagemId_idx" ON "Anexo" ("mensagemId");

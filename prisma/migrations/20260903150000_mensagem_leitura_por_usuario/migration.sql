-- Leitura de mensagem passa a ser por usuário: "Mensagem.lidoEm" era um único
-- campo global, então o primeiro usuário a abrir o chamado marcava a mensagem
-- como lida pra todo mundo, sumindo a notificação de quem ainda não tinha
-- visto. Cada usuário agora tem sua própria marca de leitura.

-- CreateTable
CREATE TABLE "MensagemLeitura" (
    "id" TEXT NOT NULL,
    "mensagemId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "lidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemLeitura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MensagemLeitura_mensagemId_usuarioId_key" ON "MensagemLeitura"("mensagemId", "usuarioId");

-- AddForeignKey
ALTER TABLE "MensagemLeitura" ADD CONSTRAINT "MensagemLeitura_mensagemId_fkey" FOREIGN KEY ("mensagemId") REFERENCES "Mensagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemLeitura" ADD CONSTRAINT "MensagemLeitura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: mensagens já marcadas como lidas (globalmente, no modelo antigo)
-- viram "lidas por todo mundo que não é o autor", preservando o instante
-- original. Não dá pra saber quem leu de fato no modelo antigo — tratar como
-- "lido por todos" evita que mensagens antigas já vistas voltem a aparecer
-- como notificação nova pra quem já tinha lido.
INSERT INTO "MensagemLeitura" ("id", "mensagemId", "usuarioId", "lidoEm")
SELECT md5(m.id || ':' || u.id), m.id, u.id, m."lidoEm"
FROM "Mensagem" m
CROSS JOIN "Usuario" u
WHERE m."lidoEm" IS NOT NULL AND u.id <> m."autorId"
ON CONFLICT ("mensagemId", "usuarioId") DO NOTHING;

-- DropColumn
ALTER TABLE "Mensagem" DROP COLUMN "lidoEm";

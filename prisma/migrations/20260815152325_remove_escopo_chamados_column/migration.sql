-- Coluna substituída por veTodosChamados/veChamadosPdvsVinculados (já
-- backfilados a partir dos valores existentes antes desta migration ser
-- registrada; aplicada em dev via `prisma db push --accept-data-loss`).
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PerfilAcesso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "podeAbrirChamado" BOOLEAN NOT NULL DEFAULT false,
    "podeAlterarStatus" BOOLEAN NOT NULL DEFAULT false,
    "podeResponderChat" BOOLEAN NOT NULL DEFAULT false,
    "podeCancelarReabrirProprio" BOOLEAN NOT NULL DEFAULT false,
    "podeCancelarReabrirTodos" BOOLEAN NOT NULL DEFAULT false,
    "podeVerRelatorios" BOOLEAN NOT NULL DEFAULT false,
    "podeGerenciarCadastros" BOOLEAN NOT NULL DEFAULT false,
    "veTodosChamados" BOOLEAN NOT NULL DEFAULT false,
    "veChamadosPdvsVinculados" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_PerfilAcesso" ("id", "nome", "cor", "ordem", "ativo", "podeAbrirChamado", "podeAlterarStatus", "podeResponderChat", "podeCancelarReabrirProprio", "podeCancelarReabrirTodos", "podeVerRelatorios", "podeGerenciarCadastros", "veTodosChamados", "veChamadosPdvsVinculados", "createdAt")
SELECT "id", "nome", "cor", "ordem", "ativo", "podeAbrirChamado", "podeAlterarStatus", "podeResponderChat", "podeCancelarReabrirProprio", "podeCancelarReabrirTodos", "podeVerRelatorios", "podeGerenciarCadastros", "veTodosChamados", "veChamadosPdvsVinculados", "createdAt" FROM "PerfilAcesso";
DROP TABLE "PerfilAcesso";
ALTER TABLE "new_PerfilAcesso" RENAME TO "PerfilAcesso";
CREATE UNIQUE INDEX "PerfilAcesso_nome_key" ON "PerfilAcesso"("nome");
PRAGMA foreign_keys=ON;

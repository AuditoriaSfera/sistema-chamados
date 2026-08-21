-- RedefineTables
PRAGMA defer_foreign_keys=ON;
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
    "escopoChamados" TEXT NOT NULL DEFAULT 'PROPRIOS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_PerfilAcesso" ("ativo", "cor", "createdAt", "escopoChamados", "id", "nome", "ordem", "podeAbrirChamado", "podeAlterarStatus", "podeCancelarReabrirProprio", "podeCancelarReabrirTodos", "podeGerenciarCadastros", "podeResponderChat", "podeVerRelatorios") SELECT "ativo", "cor", "createdAt", "escopoChamados", "id", "nome", "ordem", "podeAbrirChamado", "podeAlterarStatus", "podeCancelarReabrirProprio", "podeCancelarReabrirTodos", "podeGerenciarCadastros", "podeResponderChat", "podeVerRelatorios" FROM "PerfilAcesso";
DROP TABLE "PerfilAcesso";
ALTER TABLE "new_PerfilAcesso" RENAME TO "PerfilAcesso";
CREATE UNIQUE INDEX "PerfilAcesso_nome_key" ON "PerfilAcesso"("nome");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

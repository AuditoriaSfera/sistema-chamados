-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "vePedidosDaEquipe" BOOLEAN NOT NULL DEFAULT false,
    "senhaProvisoria" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Usuario" ("ativo", "createdAt", "email", "id", "nome", "perfil", "senhaHash", "updatedAt", "vePedidosDaEquipe") SELECT "ativo", "createdAt", "email", "id", "nome", "perfil", "senhaHash", "updatedAt", "vePedidosDaEquipe" FROM "Usuario";
DROP TABLE "Usuario";
ALTER TABLE "new_Usuario" RENAME TO "Usuario";
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

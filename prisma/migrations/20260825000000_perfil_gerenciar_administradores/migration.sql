-- AlterTable
ALTER TABLE "PerfilAcesso" ADD COLUMN     "podeGerenciarAdministradores" BOOLEAN NOT NULL DEFAULT false;

-- Até aqui, "gerenciar cadastros" era um poder só: quem tinha a permissão
-- criava e editava qualquer usuário, inclusive outros administradores. Com a
-- coluna nova entrando em false para todo mundo, ninguém conseguiria mais
-- promover um administrador — o sistema ficaria sem quem administrasse.
-- Esta linha mantém o poder de quem já o tinha; a separação passa a valer só
-- para os perfis criados daqui em diante.
UPDATE "PerfilAcesso" SET "podeGerenciarAdministradores" = true WHERE "podeGerenciarCadastros" = true;

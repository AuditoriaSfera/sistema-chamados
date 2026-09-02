-- Unifica a visibilidade de chamados por perfil numa escolha só.
--
-- Antes: duas caixas independentes (veTodosChamados / veChamadosPdvsVinculados)
-- com uma regra de prioridade escondida ("todos" sempre vencia quando as duas
-- estavam marcadas) — foi exatamente esse o bug do Supervisor/Operador
-- enxergando chamados fora do PDV vinculado, mesmo com vínculo cadastrado.
--
-- Agora: o vínculo por PDV (UsuarioPdv) sempre restringe, pra qualquer perfil,
-- sem exceção. A única escolha que resta é veSomenteProprios — dentro do
-- recorte por PDV, ver só os chamados que o próprio usuário abriu ou os de
-- todo mundo do(s) PDV(s).

ALTER TABLE "PerfilAcesso" ADD COLUMN "veSomenteProprios" BOOLEAN NOT NULL DEFAULT false;

-- Antigo "PROPRIOS" (as duas desmarcadas) vira veSomenteProprios = true.
-- Antigo "TODOS" ou "PDVS_VINCULADOS" (qualquer uma marcada) vira false —
-- passa a ver todo mundo do(s) PDV(s) vinculados, sem mais bypass de PDV.
UPDATE "PerfilAcesso"
   SET "veSomenteProprios" = NOT ("veTodosChamados" OR "veChamadosPdvsVinculados");

ALTER TABLE "PerfilAcesso" DROP COLUMN "veTodosChamados";
ALTER TABLE "PerfilAcesso" DROP COLUMN "veChamadosPdvsVinculados";

-- Rede de segurança: como o vínculo por PDV passa a valer sempre, um usuário
-- que hoje não tem NENHUM vínculo cadastrado (comum em perfis que dependiam
-- do bypass "vê todos") ficaria travado vendo zero chamados. Pra não reduzir
-- o acesso de ninguém de uma hora pra outra, quem está sem nenhum vínculo
-- recebe o vínculo com todos os PDVs ativos — o admin pode restringir depois,
-- pelo cadastro de usuário, se quiser.
INSERT INTO "UsuarioPdv" (id, "usuarioId", "pdvId", "createdAt")
SELECT 'upd' || replace(gen_random_uuid()::text, '-', ''), u.id, p.id, now()
  FROM "Usuario" u
 CROSS JOIN "Pdv" p
 WHERE p.ativo
   AND NOT EXISTS (SELECT 1 FROM "UsuarioPdv" x WHERE x."usuarioId" = u.id);

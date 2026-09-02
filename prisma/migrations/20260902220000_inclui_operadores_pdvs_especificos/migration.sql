-- Inclui 32 novos usuários de perfil Operador, cada um vinculado ao(s) PDV(s)
-- específico(s) da coluna ER da planilha (não a todos os PDVs, como na
-- migração de Supervisores 20260901180000).
--
-- Duas pessoas ficam sem vínculo de PDV (Kíssila e Maria Eduarda) porque a
-- ER delas na planilha (LEOPODINA e SANTOS DUMONT) não corresponde a nenhum
-- PDV cadastrado hoje — o próprio Bruno confirmou que são nomes com erro de
-- digitação e que pode ficar pra ele vincular manualmente depois. Pelo mesmo
-- motivo, as 4 pessoas de "TRÊS RIOS/VALENÇA" só ficam vinculadas a Três
-- Rios — "Valença" não corresponde a PDV nenhum cadastrado.
--
-- Senha temporária: Sfera@123 (mesmo hash já usado nos Supervisores). Todas
-- entram com senhaProvisoria = true, então o sistema exige a troca no
-- primeiro acesso.
--
-- Seguro para rodar em ambiente com dados: só INSERT, nenhum UPDATE ou
-- DELETE. Cada inserção tem NOT EXISTS, então nada duplica e nada existente
-- é tocado. O `prisma migrate` garante que rode uma única vez por ambiente.

DO $$
DECLARE
  v_perfil_id text;
  v_admin_id  text;
  v_senha     text := '$2b$10$nZlT6SqSP1S3Zpg/W/1OzuqaXJTLcf28fKFZ.JVqbTDDjnXg/n3oy';
  v_novos     int;
BEGIN
  SELECT id INTO v_perfil_id FROM "PerfilAcesso" WHERE lower(nome) = 'operador' LIMIT 1;
  IF v_perfil_id IS NULL THEN
    RAISE EXCEPTION 'Perfil Operador não encontrado.';
  END IF;

  SELECT id INTO v_admin_id FROM "Usuario" WHERE lower(email) = 'bruno.batista' LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT u.id INTO v_admin_id
      FROM "Usuario" u
      JOIN "PerfilAcesso" p ON p.id = u.perfil
     WHERE p."podeGerenciarCadastros"
     LIMIT 1;
  END IF;

  CREATE TEMP TABLE novos_operadores (nome text, login text, pdv_codigo text);

  -- pdv_codigo NULL = sem vínculo (resolver manualmente); 'TODOS' = todos os PDVs ativos
  INSERT INTO novos_operadores (nome, login, pdv_codigo) VALUES
    ('Leidinaira de Oliveira Barbosa', 'leidinaira.oliveira', '24064'),
    ('Maria Izabela Alves de Carvalho', 'maria.izabela', '23441'),
    ('Tamiles Stefani da Silva Paula', 'tamiles.stefani', '21469'),
    ('Amanda Cristina Miranda da Silva', 'amanda.cristina', '21469'),
    ('Kezia Domingos Vieira de Almeida', 'kezia.domingos', '21469'),
    ('Livia Aparecida Fernandes', 'livia.aparecida', '21469'),
    ('Erika Carvalho Gomes', 'erika.carvalho', '21469'),
    ('Daniela Menezes da Silva', 'daniela.menezes', '21469'),
    ('Eliana Beatriz Campos Resende', 'eliana.beatriz', '21469'),
    ('Kíssila do Couto Tonasso', 'kissila.couto', NULL),
    ('Cauanny Reges', 'cauanny.reges', '20740'),
    ('Danielle Paes do Amaral Lima', 'danielle.paes', '20740'),
    ('Dayane Kettelen da Cruz Gomes', 'dayane.kettelen', '20740'),
    ('Elisa Carvalho Paixão', 'elisa.carvalho', '20740'),
    ('Elisangela de Oliveira Araujo Ferreira', 'elisangela.oliveira', '20740'),
    ('Istefany Karoline de Souza Costa', 'istefany.karoline', '20740'),
    ('Lorena de Souza Peixoto dos Santos', 'lorena.souza', '20740'),
    ('Márcia Rodrigues Alves', 'marcia.rodrigues', '20740'),
    ('Mayara Evelyn Braz Alves', 'mayara.evelyn', '20740'),
    ('Natalia Goncalves Martins', 'natalia.goncalves', '20740'),
    ('Railde Galdino Argemiro', 'railde.galdino', '20740'),
    ('Rayane Cristina Pereira Silva', 'rayane.cristina', '20740'),
    ('Pauliana Aparecida de Souza', 'pauliana.aparecida', '22555'),
    ('Maria Vitoria Losch Romao', 'maria.vitoria', '22555'),
    ('Samara Gomes Martins', 'samara.gomes', '22555'),
    ('Tatiane Maria Ferreira de Sousa', 'tatiane.maria', '22552'),
    ('Maria Eduarda de Almeida', 'maria.eduarda', NULL),
    ('Ana Patricia Martins da Silva', 'ana.patricia', 'TODOS'),
    ('Ana Carolina Ferreira da S. Alves', 'ana.carolina', '21483'),
    ('Larissa Stephany Neves de Matos Ferreira', 'larissa.stephany', '21483'),
    ('Priscilla Aguiar da Silva de Santana', 'priscilla.aguiar', '21483'),
    ('Raysa de Oliveira da Silva', 'raysa.oliveira', '21483');

  -- ---------- usuarios ----------
  -- O login e o e-mail de contato dividem o mesmo campo na tela de login, entao
  -- colisao com qualquer um dos dois ja significa "usuario existente".
  INSERT INTO "Usuario" (
    id, nome, email, "senhaHash", perfil, ativo,
    "vePedidosDaEquipe", "senhaProvisoria", "createdAt", "updatedAt"
  )
  SELECT
    'usr' || replace(gen_random_uuid()::text, '-', ''),
    n.nome, n.login, v_senha, v_perfil_id, true,
    false, true, now(), now()
  FROM novos_operadores n
  WHERE NOT EXISTS (
    SELECT 1 FROM "Usuario" u
     WHERE lower(u.email) = lower(n.login)
        OR lower(u."emailContato") = lower(n.login)
  );

  GET DIAGNOSTICS v_novos = ROW_COUNT;
  RAISE NOTICE 'Operadores criados: %', v_novos;

  -- ---------- vinculo com o PDV especifico da ER ----------
  INSERT INTO "UsuarioPdv" (id, "usuarioId", "pdvId", "createdAt")
  SELECT 'upd' || replace(gen_random_uuid()::text, '-', ''), u.id, p.id, now()
    FROM "Usuario" u
    JOIN novos_operadores n ON lower(n.login) = lower(u.email)
    JOIN "Pdv" p ON p.codigo = n.pdv_codigo
   WHERE n.pdv_codigo IS NOT NULL
     AND n.pdv_codigo <> 'TODOS'
     AND NOT EXISTS (
       SELECT 1 FROM "UsuarioPdv" x WHERE x."usuarioId" = u.id AND x."pdvId" = p.id
     );

  -- ---------- vinculo com todos os PDVs ativos (ER = TODOS) ----------
  INSERT INTO "UsuarioPdv" (id, "usuarioId", "pdvId", "createdAt")
  SELECT 'upd' || replace(gen_random_uuid()::text, '-', ''), u.id, p.id, now()
    FROM "Usuario" u
    JOIN novos_operadores n ON lower(n.login) = lower(u.email)
    CROSS JOIN "Pdv" p
   WHERE n.pdv_codigo = 'TODOS'
     AND p.ativo
     AND NOT EXISTS (
       SELECT 1 FROM "UsuarioPdv" x WHERE x."usuarioId" = u.id AND x."pdvId" = p.id
     );

  -- ---------- auditoria ----------
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO "AuditLog" (id, entidade, "entidadeId", acao, "usuarioId", detalhes, "createdAt")
    SELECT
      'aud' || replace(gen_random_uuid()::text, '-', ''),
      'Usuario', u.id, 'CREATE', v_admin_id,
      json_build_object('nome', u.nome, 'email', u.email, 'perfil', v_perfil_id)::text,
      now()
    FROM "Usuario" u
    JOIN novos_operadores n ON lower(n.login) = lower(u.email)
    WHERE NOT EXISTS (
      SELECT 1 FROM "AuditLog" a
       WHERE a.entidade = 'Usuario' AND a."entidadeId" = u.id AND a.acao = 'CREATE'
    );
  END IF;

  DROP TABLE novos_operadores;
END $$;

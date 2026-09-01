-- Inclui os 41 supervisores.
--
-- Vai como migration (e nao como script avulso) porque o pre-deploy do Railway
-- roda `prisma migrate deploy`: assim a inclusao acontece sozinha no proximo
-- deploy, sem ninguem precisar abrir o Console. Mesmo caminho que a migration
-- 20260825000000 ja usou para corrigir dados.
--
-- Seguro para rodar em ambiente com dados: so INSERT, nenhum UPDATE ou DELETE.
-- Cada insercao tem NOT EXISTS, entao nada duplica e nada existente e tocado.
-- O `prisma migrate` ainda garante que ela rode uma unica vez por ambiente.
--
-- Senha temporaria: Sfera@123 (bcrypt, custo 10). Todos entram com
-- senhaProvisoria = true, entao o sistema exige a troca no primeiro acesso e a
-- senha abaixo deixa de valer. Troque-a se algum deles ainda nao tiver entrado.

DO $$
DECLARE
  v_perfil_id text;
  v_admin_id  text;
  v_senha     text := '$2b$10$nZlT6SqSP1S3Zpg/W/1OzuqaXJTLcf28fKFZ.JVqbTDDjnXg/n3oy';
  v_novos     int;
BEGIN
  -- ---------- perfil Supervisor ----------
  -- Onde ele ja existe (producao), reaproveita sem alterar as permissoes.
  SELECT id INTO v_perfil_id FROM "PerfilAcesso" WHERE lower(nome) = 'supervisor' LIMIT 1;

  IF v_perfil_id IS NULL THEN
    v_perfil_id := 'sup' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO "PerfilAcesso" (
      id, nome, cor, ordem, ativo,
      "veTodosChamados", "veChamadosPdvsVinculados",
      "podeAbrirChamado", "podeAlterarStatus", "podeResponderChat",
      "podeCancelarReabrirProprio", "podeCancelarReabrirTodos",
      "podeVerRelatorios", "podeGerenciarCadastros", "podeGerenciarAdministradores"
    ) VALUES (
      v_perfil_id, 'Supervisor', 'violet', (SELECT count(*) FROM "PerfilAcesso"), true,
      true, true,
      true, true, true,
      true, true,
      true, true, false
    );
    RAISE NOTICE 'Perfil Supervisor criado.';
  ELSE
    RAISE NOTICE 'Perfil Supervisor ja existia — reaproveitado.';
  END IF;

  -- ---------- quem assina a auditoria ----------
  SELECT id INTO v_admin_id FROM "Usuario" WHERE lower(email) = 'bruno.batista' LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT u.id INTO v_admin_id
      FROM "Usuario" u
      JOIN "PerfilAcesso" p ON p.id = u.perfil
     WHERE p."podeGerenciarCadastros"
     LIMIT 1;
  END IF;

  -- ---------- usuarios ----------
  -- O login e o e-mail de contato dividem o mesmo campo na tela de login, entao
  -- colisao com qualquer um dos dois ja significa "usuario existente".
  WITH novos(nome, login) AS (
    VALUES
      ('Kevelly Brandao Da Silva', 'kevelly.brandao'),
      ('Faraildes Cristina De Carvalho Do Nascimento', 'faraildes.cristina'),
      ('Victoria Yohana De Lima Ribeiro Dos Santos', 'victoria.yohana'),
      ('Alessandra Romero De Oliveira', 'alessandra.oliveira'),
      ('Edna Lucia Dias Korjenioski', 'edna.korjenioski'),
      ('Izabelle Rodrigues', 'izabelle.rodrigues'),
      ('Luiz Otavio Mattos Guerra', 'luiz.guerra'),
      ('Camila Ballin Hauer', 'camila.hauer'),
      ('Marcel Almeida Da Fonseca', 'marcel.fonseca'),
      ('Jessica Zawadzki', 'jessica.zawadzki'),
      ('Lourival Ferreira do Nascimento', 'lourival.ferreira'),
      ('Gabriela Rueda Kroich', 'gabriela.kroich'),
      ('Inajara De Oliveira', 'inajara.oliveira'),
      ('Tainara Garcia de Almeida de Oliveira', 'tainara.oliveira'),
      ('Andressa Barbosa De Almeida', 'andressa.barbosa'),
      ('Tabita Barbosa Ribeiro', 'tabita.ribeiro'),
      ('Isabella Dolores De Siqueira', 'isabella.siqueira'),
      ('Thiana Batista Né', 'thiana.ne'),
      ('Thomas Adryan Souza Pontes', 'thomas.souza'),
      ('Italo Rugles de Sousa Lima', 'italo.sousa'),
      ('Brenda Moreira Castanha', 'brenda.castanha'),
      ('Mayara Cardoso Castro Taborda', 'mayara.castro'),
      ('Viviane Batista Rodrigues', 'viviane.batista'),
      ('Luiz Gustavo Kiewel Lopes', 'luiz.lopes'),
      ('Vitor Gabriel Lopes Costa', 'vitor.lopes'),
      ('Maria da Saude Lopes Paiva', 'maria.saude'),
      ('Sara Izabele Rocha Silva', 'sara.rocha'),
      ('Evellyn Pereira dos Santos', 'evellyn.santos'),
      ('Jessica Mendes Teodoro', 'jessica.teodoro'),
      ('Raquel Evangelista dos Santos', 'raquel.evangelista'),
      ('Vitória Rocha da Silva', 'vitoria.rocha'),
      ('Rafaella Monteiro Guimarães', 'rafaella.guimaraes'),
      ('Ane Karoline Souza', 'ane.souza'),
      ('Gabrielly Costa dos Santos', 'gabrielly.santos'),
      ('Stephani Bianca de Souza', 'stephani.bianca'),
      ('Jamilly Gonçalves Ferreira', 'jamilly.ferreira'),
      ('Lara Júlia Gomes Fernandes Martins', 'lara.martins'),
      ('Paula Pimenta Lima Dos Santos', 'paula.santos'),
      ('Gabriela da Silva Monteiro', 'gabriela.silva'),
      ('Juliana Ribeiro Siqueira', 'juliana.siqueira'),
      ('Graziella Simoes', 'graziella.simoes')
  )
  INSERT INTO "Usuario" (
    id, nome, email, "senhaHash", perfil, ativo,
    "vePedidosDaEquipe", "senhaProvisoria", "createdAt", "updatedAt"
  )
  SELECT
    'usr' || replace(gen_random_uuid()::text, '-', ''),
    n.nome, n.login, v_senha, v_perfil_id, true,
    false, true, now(), now()
  FROM novos n
  WHERE NOT EXISTS (
    SELECT 1 FROM "Usuario" u
     WHERE lower(u.email) = lower(n.login)
        OR lower(u."emailContato") = lower(n.login)
  );

  GET DIAGNOSTICS v_novos = ROW_COUNT;
  RAISE NOTICE 'Supervisores criados: %', v_novos;

  -- ---------- vinculo com todos os PDVs ativos ----------
  INSERT INTO "UsuarioPdv" (id, "usuarioId", "pdvId", "createdAt")
  SELECT 'upd' || replace(gen_random_uuid()::text, '-', ''), u.id, p.id, now()
    FROM "Usuario" u
    CROSS JOIN "Pdv" p
   WHERE u.perfil = v_perfil_id
     AND p.ativo
     AND NOT EXISTS (
       SELECT 1 FROM "UsuarioPdv" x
        WHERE x."usuarioId" = u.id AND x."pdvId" = p.id
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
    WHERE u.perfil = v_perfil_id
      AND NOT EXISTS (
        SELECT 1 FROM "AuditLog" a
         WHERE a.entidade = 'Usuario' AND a."entidadeId" = u.id AND a.acao = 'CREATE'
      );
  END IF;
END $$;

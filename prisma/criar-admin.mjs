/**
 * Cria (ou promove) um usuário com acesso total ao sistema.
 *
 *   DATABASE_URL="postgresql://..." node prisma/criar-admin.mjs
 *
 * A senha é pedida de forma oculta e nunca vai para o histórico do shell.
 * Só o hash bcrypt é gravado — o mesmo formato que o login da aplicação espera.
 *
 * Se o login já existir, o script atualiza a senha e promove ao perfil de
 * acesso total, em vez de falhar. É seguro rodar de novo.
 */
import { randomBytes } from "node:crypto";
import readline from "node:readline";
import bcrypt from "bcryptjs";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

// mesmo formato dos ids já existentes no banco
const novoId = () => "c" + Date.now().toString(36) + randomBytes(8).toString("hex");

function pergunta(texto, { oculto = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    if (oculto) {
      // esconde o que for digitado
      const onData = (char) => {
        if ([ "\n", "\r", "" ].includes(char.toString())) process.stdin.removeListener("data", onData);
        else { readline.clearLine(process.stdout, 0); readline.cursorTo(process.stdout, 0); process.stdout.write(texto); }
      };
      process.stdin.on("data", onData);
    }
    rl.question(texto, (resposta) => { rl.close(); if (oculto) process.stdout.write("\n"); resolve(resposta.trim()); });
  });
}

const PERM_TOTAL = {
  podeAbrirChamado: true, podeAlterarStatus: true, podeResponderChat: true,
  podeCancelarReabrirProprio: true, podeCancelarReabrirTodos: true,
  podeVerRelatorios: true, podeGerenciarCadastros: true,
  veTodosChamados: true, veChamadosPdvsVinculados: true,
};

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
});
await client.connect();

try {
  // 1. perfil de acesso total: reaproveita um existente ou cria
  let { rows: perfis } = await client.query(
    `select id, nome from "PerfilAcesso"
     where ativo and "podeGerenciarCadastros" and "veTodosChamados" order by ordem limit 1`
  );
  let perfilId, perfilNome;
  if (perfis.length) {
    ({ id: perfilId, nome: perfilNome } = perfis[0]);
    console.log(`Perfil de acesso total encontrado: "${perfilNome}"`);
    // garante todas as flags ligadas
    await client.query(
      `update "PerfilAcesso" set ${Object.keys(PERM_TOTAL).map((k, i) => `"${k}"=$${i + 2}`).join(", ")} where id=$1`,
      [perfilId, ...Object.values(PERM_TOTAL)]
    );
  } else {
    perfilId = novoId();
    perfilNome = "Administrador";
    const cols = Object.keys(PERM_TOTAL);
    await client.query(
      `insert into "PerfilAcesso" (id, nome, cor, ordem, ativo, ${cols.map((c) => `"${c}"`).join(", ")})
       values ($1, $2, '#2563eb', 0, true, ${cols.map((_, i) => `$${i + 3}`).join(", ")})`,
      [perfilId, perfilNome, ...Object.values(PERM_TOTAL)]
    );
    console.log(`Perfil "${perfilNome}" criado.`);
  }

  // 2. dados do usuário
  const login = await pergunta("Login (é o que se digita no campo Usuário): ");
  if (!login) throw new Error("Login é obrigatório.");
  const nome = (await pergunta("Nome completo: ")) || login;
  const senha = await pergunta("Senha: ", { oculto: true });
  if (senha.length < 8) throw new Error("Use uma senha de pelo menos 8 caracteres.");
  const confirma = await pergunta("Confirme a senha: ", { oculto: true });
  if (senha !== confirma) throw new Error("As senhas não conferem.");

  const senhaHash = await bcrypt.hash(senha, 10);

  // 3. cria ou promove
  const { rows: existentes } = await client.query(`select id from "Usuario" where email=$1`, [login]);
  if (existentes.length) {
    await client.query(
      `update "Usuario" set nome=$2, "senhaHash"=$3, perfil=$4, ativo=true,
              "senhaProvisoria"=false, "updatedAt"=now() where id=$1`,
      [existentes[0].id, nome, senhaHash, perfilId]
    );
    console.log(`\nUsuário "${login}" já existia — senha redefinida e promovido a ${perfilNome}.`);
  } else {
    await client.query(
      `insert into "Usuario" (id, nome, email, "senhaHash", perfil, ativo,
                              "vePedidosDaEquipe", "senhaProvisoria", "createdAt", "updatedAt")
       values ($1, $2, $3, $4, $5, true, true, false, now(), now())`,
      [novoId(), nome, login, senhaHash, perfilId]
    );
    console.log(`\nUsuário "${login}" criado com perfil ${perfilNome}.`);
  }
  console.log("Já dá para entrar em https://sistema-chamados-production-1257.up.railway.app");
} catch (e) {
  console.error("\nErro:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

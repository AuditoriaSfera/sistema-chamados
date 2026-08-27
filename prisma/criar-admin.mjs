/**
 * Cria ou atualiza um usuário do sistema.
 *
 *   DATABASE_URL="postgresql://..." node prisma/criar-admin.mjs
 *
 * No Railway dá para rodar direto pelo Console do serviço (aba Console):
 * o DATABASE_URL já está no ambiente do container.
 *
 *   node prisma/criar-admin.mjs
 *
 * A senha é digitada de forma oculta e nunca aparece no histórico do shell.
 * Só o hash bcrypt é gravado — o mesmo formato que o login da aplicação espera.
 *
 * Se o login já existir, o script atualiza (senha, nome, perfil) em vez de falhar.
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

const novoId = () => "c" + Date.now().toString(36) + randomBytes(8).toString("hex");

function pergunta(texto, { oculto = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    if (oculto) {
      const onData = (char) => {
        if (["\n", "\r", ""].includes(char.toString())) process.stdin.removeListener("data", onData);
        else { readline.clearLine(process.stdout, 0); readline.cursorTo(process.stdout, 0); process.stdout.write(texto); }
      };
      process.stdin.on("data", onData);
    }
    rl.question(texto, (r) => { rl.close(); if (oculto) process.stdout.write("\n"); resolve(r.trim()); });
  });
}

const PERM_TOTAL = {
  podeAbrirChamado: true, podeAlterarStatus: true, podeResponderChat: true,
  podeCancelarReabrirProprio: true, podeCancelarReabrirTodos: true,
  podeVerRelatorios: true, podeGerenciarCadastros: true,
  podeGerenciarAdministradores: true,
  veTodosChamados: true, veChamadosPdvsVinculados: true,
};

const client = new pg.Client({
  connectionString,
  ssl: /localhost|\.railway\.internal/.test(connectionString) ? false : { rejectUnauthorized: false },
});
await client.connect();

try {
  // ---- escolha do perfil ----
  let { rows: perfis } = await client.query(
    `select id, nome, "podeGerenciarCadastros", "podeGerenciarAdministradores", "veTodosChamados"
     from "PerfilAcesso" where ativo order by ordem`
  );

  if (!perfis.length) {
    const id = novoId();
    const cols = Object.keys(PERM_TOTAL);
    await client.query(
      `insert into "PerfilAcesso" (id, nome, cor, ordem, ativo, ${cols.map(c => `"${c}"`).join(", ")})
       values ($1, 'Administrador', '#2563eb', 0, true, ${cols.map((_, i) => `$${i + 2}`).join(", ")})`,
      [id, ...Object.values(PERM_TOTAL)]
    );
    console.log('Nenhum perfil existia — criei "Administrador" com acesso total.');
    perfis = [{ id, nome: "Administrador", podeGerenciarAdministradores: true }];
  }

  console.log("\nPerfis disponíveis:");
  perfis.forEach((p, i) => {
    const marca = p.podeGerenciarAdministradores ? "  (administrador pleno)" : "";
    console.log(`  ${i + 1}) ${p.nome}${marca}`);
  });
  const escolha = await pergunta(`Perfil [1-${perfis.length}]: `);
  const perfil = perfis[Number(escolha) - 1];
  if (!perfil) throw new Error("Perfil inválido.");

  // ---- dados do usuário ----
  const login = await pergunta("Login (o que se digita no campo Usuário): ");
  if (!login) throw new Error("Login é obrigatório.");
  const nome = (await pergunta("Nome completo: ")) || login;

  const senha = await pergunta("Senha: ", { oculto: true });
  if (senha.length < 6) throw new Error("Use uma senha de pelo menos 6 caracteres.");
  const confirma = await pergunta("Confirme a senha: ", { oculto: true });
  if (senha !== confirma) throw new Error("As senhas não conferem.");

  const temp = (await pergunta("É senha provisória (obriga trocar no 1º acesso)? [S/n]: ")).toLowerCase();
  const senhaProvisoria = temp !== "n";

  const senhaHash = await bcrypt.hash(senha, 10);

  const { rows: existentes } = await client.query(`select id from "Usuario" where email=$1`, [login]);
  if (existentes.length) {
    await client.query(
      `update "Usuario" set nome=$2, "senhaHash"=$3, perfil=$4, ativo=true,
              "senhaProvisoria"=$5, "updatedAt"=now() where id=$1`,
      [existentes[0].id, nome, senhaHash, perfil.id, senhaProvisoria]
    );
    console.log(`\n"${login}" já existia — senha redefinida, perfil ${perfil.nome}.`);
  } else {
    await client.query(
      `insert into "Usuario" (id, nome, email, "senhaHash", perfil, ativo,
                              "vePedidosDaEquipe", "senhaProvisoria", "createdAt", "updatedAt")
       values ($1, $2, $3, $4, $5, true, true, $6, now(), now())`,
      [novoId(), nome, login, senhaHash, perfil.id, senhaProvisoria]
    );
    console.log(`\n"${login}" criado com perfil ${perfil.nome}.`);
  }
  if (senhaProvisoria) console.log("Vai cair na tela de troca de senha no primeiro acesso.");
} catch (e) {
  console.error("\nErro:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

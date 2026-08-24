/**
 * Carrega prisma/dados-iniciais.sql (dados migrados do antigo dev.db SQLite)
 * no Postgres apontado por DATABASE_URL.
 *
 * Rodar DEPOIS de `npx prisma migrate deploy`:
 *   DATABASE_URL="postgresql://..." node prisma/aplicar-dados.mjs
 *
 * É idempotente: os INSERTs usam ON CONFLICT DO NOTHING, então rodar duas
 * vezes não duplica nada.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

const arquivo = join(dirname(fileURLToPath(import.meta.url)), "dados-iniciais.sql");
const sql = readFileSync(arquivo, "utf8");

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  const tabelas = [
    "PerfilAcesso", "Usuario", "Pdv", "PdvHorario", "UsuarioPdv", "Pedido",
    "SlaPreset", "Servico", "Status", "ChamadoContador", "Chamado",
    "Mensagem", "Anexo", "StatusHistorico", "ConfigGeral", "AuditLog",
  ];
  console.log("Dados carregados:");
  for (const t of tabelas) {
    const { rows } = await client.query(`select count(*)::int as c from "${t}"`);
    console.log(`  ${t.padEnd(18)} ${rows[0].c}`);
  }
} finally {
  await client.end();
}

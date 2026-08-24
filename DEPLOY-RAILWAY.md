# Deploy no Railway — o que mudou e o que falta fazer

## Por que o build falhava

`src/generated/prisma` está no `.gitignore`, então o Prisma Client **nunca existiu no
servidor do Railway** — só na sua máquina, onde você rodou `prisma generate` alguma vez.
O `next build` importava `@/generated/prisma/client` e não achava nada.

Além disso o projeto usava **SQLite** (`dev.db`), e o filesystem do Railway é efêmero:
o banco e os anexos seriam apagados a cada deploy.

## O que já foi feito

### No código (nesta pasta)

| Arquivo | Mudança |
|---|---|
| `package.json` | `build` agora é `prisma generate && next build`; adicionado `postinstall: prisma generate`. Trocado `@prisma/adapter-better-sqlite3` por `@prisma/adapter-pg` + `pg`; `dotenv` declarado explicitamente (era só transitivo e o `prisma.config.ts` depende dele) |
| `prisma/schema.prisma` | `provider` de `sqlite` para `postgresql`, com `url = env("DATABASE_URL")` |
| `prisma/migrations/` | Migrations antigas de SQLite removidas (não rodam em Postgres). Nova baseline `20260824000000_init_postgres` |
| `src/lib/db.ts` | Usa `PrismaPg` em vez de `PrismaBetterSqlite3`; falha explicitamente se `DATABASE_URL` não existir |
| `prisma/seed.ts` | Mesmo ajuste de adapter |
| `src/lib/uploads.ts` | `UPLOADS_ROOT` agora vem do ambiente (aponta pro volume), com fallback pro comportamento antigo em dev |
| `src/lib/auth.config.ts` | `trustHost: true` — sem isso o next-auth v5 recusa o host atrás do proxy do Railway |
| `prisma/dados-iniciais.sql` | Seus 274 registros do `dev.db` convertidos para Postgres (gitignorado, contém hashes de senha) |
| `prisma/aplicar-dados.mjs` | Script que carrega o SQL acima no Postgres |

Bônus: sair do `better-sqlite3` também remove uma compilação nativa (node-gyp) do build.

### No Railway

- **Postgres** provisionado e online, com volume próprio
- **Volume** `sistema-chamados-volume` montado em `/app/uploads`
- **Variáveis** no serviço `sistema-chamados`:
  - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (referência, não valor fixo)
  - `AUTH_SECRET` = `${{secret(64)}}` (gerado pelo próprio Railway)
  - `UPLOADS_ROOT` = `/app/uploads`
- **Pre-deploy command**: `npx prisma migrate deploy` — cria as tabelas antes do app subir

## O que falta você fazer

### 1. Subir o código para o GitHub

O Railway observa `AuditoriaSfera/sistema-chamados`. Esta pasta não é um repositório git,
então copie os arquivos alterados para o seu clone e faça o push:

```bash
git add package.json .gitignore prisma/ src/lib/db.ts src/lib/uploads.ts src/lib/auth.config.ts
git commit -m "Migra de SQLite para Postgres e corrige prisma generate no build"
git push
```

Atenção ao `git status`: as 8 migrations antigas de SQLite precisam aparecer como
**deletadas**. Se ficarem no repo, o `migrate deploy` tenta rodá-las no Postgres e falha.

O push dispara o build automaticamente.

### 2. Carregar os dados do dev.db

Depois que o deploy passar (as tabelas já vão existir), rode **uma vez**:

```bash
DATABASE_URL="<DATABASE_PUBLIC_URL do Postgres no Railway>" node prisma/aplicar-dados.mjs
```

Pegue a `DATABASE_PUBLIC_URL` em: Railway → serviço Postgres → Variables.
Use a **pública**, não a `.railway.internal` — essa só funciona de dentro da rede deles.

O script é idempotente (`ON CONFLICT DO NOTHING`), rodar duas vezes não duplica nada.

### 3. Gerar o domínio público

Settings → Networking → **Generate Domain**. Não fiz isso porque você pode preferir
um domínio próprio.

## Pontos de atenção

- **Anexos antigos não vieram.** A tabela `Anexo` tem 11 registros apontando para arquivos
  que estavam em `./uploads` na sua máquina. Os metadados foram migrados, mas os arquivos
  em si precisam ser copiados para o volume — ou esses 11 anexos vão dar erro ao abrir.
- **A migration baseline foi escrita à mão** (o ambiente onde trabalhei não conseguia baixar
  os engines do Prisma). Foi validada executando de verdade num Postgres: 17 tabelas,
  22 foreign keys, 24 índices únicos, e os 274 registros entraram sem violar constraint
  nenhuma. Ainda assim, se quiser a versão canônica gerada pelo Prisma, apague a pasta
  `20260824000000_init_postgres` e rode `npx prisma migrate dev --name init_postgres`
  contra um Postgres local antes do push.
- **Não coloquei `NODE_ENV=production`** nas variáveis de propósito: isso faz o instalador
  pular as devDependencies (typescript, tailwind, @types) e o `next build` quebra. O Railway
  já define isso sozinho em runtime.
- **`prisma/dados-iniciais.sql` está no `.gitignore`** porque contém hashes de senha dos
  usuários. Não commite.

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
| `prisma/schema.prisma` | `provider` de `sqlite` para `postgresql`. **Sem** `url` no bloco `datasource` — no Prisma 7 isso não é mais permitido; a URL vem do `prisma.config.ts`, que o projeto já tinha configurado |
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
- **Domínio**: https://sistema-chamados-production-1257.up.railway.app
- **Deploy verde**: migration aplicada, 17 tabelas criadas, `next start` no ar

## Correção aplicada depois do primeiro deploy

O primeiro build falhou com `P1012`: eu tinha adicionado `url = env("DATABASE_URL")` ao
bloco `datasource` ao trocar o provider. No Prisma 7 essa propriedade foi removida do
schema — a URL vive no `prisma.config.ts` (que este projeto já tinha) e o client recebe
o `adapter`. O schema original também não tinha `url`; foi introdução minha.

Corrigido: o bloco `datasource` voltou a ter só o `provider`. Agora validado de verdade
com `@prisma/prisma-schema-wasm` — `validate`, `get_config` e `get_dmmf` passam, e a
contraprova (schema com `url`) reproduz exatamente o `P1012` que o Railway devolveu.

## Bug encontrado depois: anexos gravados no Windows

`saveAnexo` usava `path.join(chamadoId, storedName)`, que no Windows produz
`chamadoId\arquivo.png`. No Linux do Railway esse valor não é subpasta + arquivo —
é um nome de arquivo só, com uma barra invertida no meio. Os 11 anexos existentes
quebrariam ao abrir, mesmo com os arquivos no volume.

Corrigido em três frentes:

- `saveAnexo` agora grava sempre com `/`, independente do sistema operacional
- novo `resolveAnexoPath()` normaliza `\` para `/` ao ler, então os registros legados
  continuam funcionando
- de quebra, a checagem de path traversal virou `path.relative` em vez de
  `startsWith` — a antiga deixava passar caminhos irmãos como `../uploads-secreto/x.png`,
  o que importa mais agora que o app está exposto na internet

Coberto por 7 testes novos em `src/lib/uploads-resolve.test.ts` (38 no total, todos passando).
As asserções montam os caminhos com `path.join`, então a suíte roda igual no Windows e no Linux.
Os caminhos em `dados-iniciais.sql` também já saem normalizados.

## package-lock.json regenerado

O `package-lock.json` tinha ficado para trás: ainda listava `@prisma/adapter-better-sqlite3`
e não conhecia `pg`, `@types/pg` nem `dotenv`. Com `npm install` o Railway se vira
(reconcilia o lock sozinho), mas com `npm ci` o build falharia — `npm ci` exige lock e
`package.json` em sincronia. Rodei o install e o lock atualizado vai junto neste commit.

## O que falta você fazer — nesta ordem

### 1. Subir a correção dos anexos

```bash
git add src/lib/uploads.ts src/lib/uploads-resolve.test.ts \
        "src/app/api/anexos/[anexoId]/route.ts" subir-anexos.sh DEPLOY-RAILWAY.md
git commit -m "Normaliza caminho de anexo para POSIX e reforca checagem de traversal"
git push
```

### 2. Carregar os dados

Depois que o deploy passar:

```bash
DATABASE_URL="<DATABASE_PUBLIC_URL do Postgres no Railway>" node prisma/aplicar-dados.mjs
```

Pegue a `DATABASE_PUBLIC_URL` em: Railway → serviço Postgres → Variables.
Use a **pública**, não a `.railway.internal` — essa só funciona de dentro da rede deles.

O script é idempotente (`ON CONFLICT DO NOTHING`) e imprime a contagem por tabela
no final. O esperado é: Usuario 6, PerfilAcesso 4, Pdv 10, PdvHorario 70, UsuarioPdv 27,
Pedido 5, SlaPreset 5, Servico 11, Status 7, Chamado 5, Mensagem 28, Anexo 11,
StatusHistorico 17, AuditLog 66 — 274 registros no total.

### 3. Os arquivos dos 11 anexos ~~subir para o volume~~ se perderam

Os binários não estão mais na máquina de origem: varri o perfil inteiro do usuário e
não existe pasta `uploads/` do projeto nem nenhum dos 11 arquivos (`7266ade3-…` e
companhia). O `dev.db` trouxe os metadados; os arquivos em si, não. Rodar o
`subir-anexos.sh` hoje só imprimiria "AUSENTE" nas 11 linhas.

Como os registros da tabela `Anexo` fazem parte do histórico dos chamados — quem
anexou o quê e quando —, eles **ficam no banco**. O que mudou foi o comportamento
quando o arquivo não existe:

- `GET /api/anexos/[id]` capturava nada e estourava `ENOENT` → **500**. Agora devolve
  **404 "Arquivo indisponível."**
- nas mensagens, a miniatura que falhava virava ícone de imagem quebrada. Agora o
  `onError` troca por um bloco tracejado com o nome do arquivo, no mesmo estilo do
  "Anexo apagado" que já existia

Anexos novos, enviados pelo app em produção, gravam direto no volume e funcionam
normalmente — o problema é só com esses 11 legados.

**Se os arquivos reaparecerem** (backup, outra máquina), o `subir-anexos.sh` continua
válido: coloque a pasta `uploads/` na raiz do projeto e rode

```bash
npm i -g @railway/cli
railway login
railway link          # captivating-joy > production > sistema-chamados
bash subir-anexos.sh
railway volume files list / -s sistema-chamados   # conferir
```

### 4. Criar sua conta de acesso total

Pelo painel do Railway **não funciona**: `senhaHash` guarda um hash bcrypt (senha em
texto puro nunca autentica), `updatedAt` não tem default no banco, `perfil` é o id do
PerfilAcesso e o `id` precisa ser gerado. Use o script:

```bash
DATABASE_URL="<DATABASE_PUBLIC_URL>" npm run db:admin
```

Ele pede login, nome e senha (a senha é digitada oculta e não vai para o histórico do
shell), reaproveita o perfil "Administrador" que já vem nos dados migrados e cria o
usuário. Se o login já existir, redefine a senha e promove em vez de falhar — pode
rodar de novo à vontade.

Os 6 usuários migrados do dev continuam lá com as senhas antigas. Vale revisar:
`Bruno Batista` (`bruno.batista`) já é Administrador, e há dois usuários de teste
inativos (`12345` e `teste.senha@demo.local`).

## Pontos de atenção

- **A migration baseline foi escrita à mão** (o ambiente onde trabalhei não baixa os
  engines nativos do Prisma). Agora ela está conferida contra o datamodel real do Prisma,
  extraído via `get_dmmf`: as 17 tabelas, todas as colunas, tipos SQL, nullability,
  defaults, índices únicos, chaves primárias e as 22 foreign keys batem exatamente com o
  que o Prisma espera. Os 274 registros também entram sem violar constraint nenhuma.
  Se ainda assim quiser a versão canônica gerada pelo próprio Prisma, apague a pasta
  `20260824000000_init_postgres` e rode `npx prisma migrate dev --name init_postgres`
  contra um Postgres local antes do push.
- **Não coloquei `NODE_ENV=production`** nas variáveis de propósito: isso faz o instalador
  pular as devDependencies (typescript, tailwind, @types) e o `next build` quebra. O Railway
  já define isso sozinho em runtime.
- **`prisma/dados-iniciais.sql` está no `.gitignore`** porque contém hashes de senha dos
  usuários. Não commite.

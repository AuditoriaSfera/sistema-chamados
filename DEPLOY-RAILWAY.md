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
| `prisma/dados-iniciais.sql` | Configuração inicial de produção extraída do `dev.db`: cadastros + o usuário Bruno Batista, 120 registros (gitignorado, contém hash de senha) |
| `prisma/criar-admin.mjs` | Cria ou promove um usuário com acesso total, pedindo a senha de forma oculta |
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

## Bug corrigido: anexos gravados no Windows

(Os 11 anexos de teste acabaram ficando de fora da carga, mas a correção vale para
todos os anexos criados daqui pra frente.)


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

## Decisão sobre os dados de teste

A carga inicial leva **só os cadastros + o usuário Bruno Batista** (120 registros).
Ficaram de fora os 5 chamados de teste, com seus pedidos, mensagens, anexos, histórico
de status e 66 registros de auditoria — e também os outros 5 usuários (`Operador Demo`,
`Solicitante Demo`, `Gestor Demo`, `Teste Duplicado`, `Teste Senha`).

O contador de chamados foi zerado junto, então o primeiro chamado aberto em produção
será o **#1** e não o #6.

Como nada disso chegou a ser carregado no Postgres, não foi preciso apagar nada: os
registros simplesmente não entram. Se um dia quiser os dados de teste de volta, é só
regerar o `dados-iniciais.sql` a partir do `dev.db`.

## O que falta você fazer — tudo pelo navegador

Não precisa de Node, terminal local nem da DATABASE_URL. O **Console** do serviço
`sistema-chamados` no Railway é um shell dentro do container, rodando como root em
`/app`, com `DATABASE_URL` já no ambiente e `bcryptjs`/`pg` instalados.

### 1. Enviar dois arquivos

No Railway → serviço **sistema-chamados** → aba **Console** → painel **Files**
(rodapé) → botão **Upload**. Entre na pasta `prisma/` e envie:

- `prisma/dados-iniciais.sql`
- `prisma/criar-admin.mjs` (a versão nova, que pergunta o perfil)

O `dados-iniciais.sql` não vem no repositório de propósito — contém o hash de senha
do Bruno. Enviar por aqui mantém isso fora do GitHub. Os dois arquivos somem no
próximo deploy, o que é ótimo: são de uso único.

### 2. Carregar a configuração inicial

No Console:

```bash
node prisma/aplicar-dados.mjs
```

Vai imprimir a contagem por tabela. Esperado: PerfilAcesso 4, Usuario 1, Pdv 10,
PdvHorario 70, UsuarioPdv 10, SlaPreset 5, Servico 11, Status 7, ChamadoContador 1,
ConfigGeral 1 — **120 registros**. Chamado, Pedido, Mensagem, Anexo, StatusHistorico
e AuditLog ficam vazios de propósito.

### 3. Definir a senha do Bruno

```bash
node prisma/criar-admin.mjs
```

Escolha o perfil **Administrador**, informe `bruno.batista` como login e digite a
senha. Ele detecta que o usuário já existe e só redefine.

### 4. Criar o Leonardo

Rode o mesmo comando de novo:

```bash
node prisma/criar-admin.mjs
```

- Perfil: o que ele precisar (Administrador para acesso total)
- Login: `leonardo.sobral@sferamultifranquias.com`
- Nome: `Leonardo Sobral`
- Senha: uma temporária
- Senha provisória: **S**

Com a senha provisória marcada, o `proxy.ts` bloqueia o Leonardo em `/conta/senha`
até ele escolher a própria senha — assim ninguém além dele conhece a senha final.

Daqui pra frente, dá para criar os outros usuários pela própria tela
**Cadastros → Usuários**, que já faz isso e ainda registra na auditoria.

## Recuperação de senha, e-mail e telefone

### O que entrou

| Onde | Mudança |
|---|---|
| `prisma/schema.prisma` | `Usuario.emailContato` (único) e `Usuario.telefone`; nova tabela `TokenSenha` |
| `prisma/migrations/20260824210000_recuperacao_senha/` | Migration correspondente |
| `src/lib/email.ts` | Envio pelo Microsoft Graph (client credentials + sendMail) |
| `src/lib/senha-reset.ts` | Geração, validação e consumo do token |
| `src/app/esqueci-senha/` | Tela de pedido do link |
| `src/app/redefinir-senha/[token]/` | Tela de escolha da nova senha |
| `src/lib/auth.ts` | Login aceita o identificador **ou** o e-mail, sem diferenciar maiúsculas |
| `src/proxy.ts` | As duas telas novas são públicas |
| Cadastro de usuários | E-mail e telefone obrigatórios na criação e na edição |

### Decisões de segurança

- O token tem 32 bytes aleatórios e vai para o banco **só como SHA-256**. Quem ler a
  tabela não consegue montar um link válido.
- Uso único, garantido no `UPDATE ... WHERE usadoEm IS NULL` — dois pedidos simultâneos
  com o mesmo token, só um vence.
- Validade de 1 hora. Pedir um link novo invalida o anterior. Trocar a senha derruba
  todos os pendentes.
- A tela responde sempre a mesma mensagem, exista ou não a conta — senão viraria um
  detector de usuários válidos.
- O nome do usuário vai escapado no corpo HTML do e-mail.

### Falta para o e-mail funcionar

Cadastrei no Railway o que não é segredo:

- `GRAPH_TENANT_ID` = `d2d6d993-2722-4b90-a743-e3943e6476e1`
- `EMAIL_REMETENTE` = `no-reply@sferamultifranquias.com`

Faltam duas, que dependem de você:

- `GRAPH_CLIENT_ID` — o **Application (client) ID** do App Registration. O
  `16846ce3-526e-40df-a65d-ad176f075f70` que você passou é o *Object ID*, que é outro
  campo: no Azure, os dois aparecem lado a lado na tela Overview do App Registration.
- `GRAPH_CLIENT_SECRET` — gere em Certificates & secrets e cadastre direto no Railway.

No App Registration ainda é preciso conceder a permissão **de aplicativo** (não
delegada) `Mail.Send` do Microsoft Graph, com consentimento do administrador. Vale
também criar uma `ApplicationAccessPolicy` restringindo o app à caixa `no-reply@`,
para que um vazamento do secret não permita enviar por qualquer caixa do tenant.

**Enquanto as duas variáveis não existirem**, o envio entra em modo de teste: nada sai
e o link aparece no log do Railway. Dá para validar o fluxo inteiro assim, mas não
serve para produção — o link de redefinição fica visível para quem lê o log.

### Uma ressalva sobre os campos obrigatórios

As colunas ficaram opcionais no banco, porque o Bruno já existia sem elas — uma coluna
`NOT NULL` sem valor padrão não entra numa tabela com linhas. A obrigatoriedade está nos
formulários. Na prática: o Bruno só consegue usar o "esqueci minha senha" depois que
alguém editar o cadastro dele e preencher o e-mail.

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

/**
 * Envio de e-mail pelo Microsoft Graph (fluxo client credentials).
 *
 * Variáveis de ambiente:
 *   GRAPH_TENANT_ID      — id do diretório (tenant) no Azure
 *   GRAPH_CLIENT_ID      — Application (client) ID do App Registration
 *   GRAPH_CLIENT_SECRET  — segredo do app  (cadastrar só no Railway)
 *   EMAIL_REMETENTE      — caixa que assina o envio, ex.: no-reply@sferamultifranquias.com
 *
 * O App Registration precisa da permissão de aplicativo Mail.Send, com
 * consentimento do administrador. Vale restringir o alcance com uma
 * ApplicationAccessPolicy para que o app só consiga enviar por essa caixa.
 *
 * Sem as variáveis configuradas o envio entra em MODO DE TESTE: nada sai, e o
 * conteúdo é impresso no log. Serve para validar o fluxo antes de ter as
 * credenciais — mas o link de redefinição aparece no log, então não é para
 * ficar assim em produção.
 */

const TOKEN_ENDPOINT = (tenant: string) =>
  `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
const SENDMAIL_ENDPOINT = (remetente: string) =>
  `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(remetente)}/sendMail`;

type Credenciais = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  remetente: string;
};

function lerCredenciais(): Credenciais | null {
  const tenantId = process.env.GRAPH_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;
  const remetente = process.env.EMAIL_REMETENTE;
  if (!tenantId || !clientId || !clientSecret || !remetente) return null;
  return { tenantId, clientId, clientSecret, remetente };
}

// O token vale ~1h; guardamos em memória para não pedir um a cada e-mail.
let tokenCache: { valor: string; expiraEm: number } | null = null;

async function obterToken(c: Credenciais): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiraEm) return tokenCache.valor;

  const corpo = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const resp = await fetch(TOKEN_ENDPOINT(c.tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: corpo,
  });

  if (!resp.ok) {
    // a resposta de erro do Azure traz descrição, mas pode ecoar dados sensíveis
    throw new Error(`Falha ao autenticar no Microsoft Graph (HTTP ${resp.status}).`);
  }

  const json = (await resp.json()) as { access_token: string; expires_in: number };
  // renova 5 min antes de expirar
  tokenCache = { valor: json.access_token, expiraEm: Date.now() + (json.expires_in - 300) * 1000 };
  return json.access_token;
}

export type Email = {
  para: string;
  assunto: string;
  corpoHtml: string;
  corpoTexto: string;
};

export async function enviarEmail({ para, assunto, corpoHtml, corpoTexto }: Email): Promise<void> {
  const c = lerCredenciais();

  if (!c) {
    console.warn(
      "[email] MODO DE TESTE — credenciais do Graph ausentes, nada foi enviado.\n" +
        `  para: ${para}\n  assunto: ${assunto}\n${corpoTexto}`
    );
    return;
  }

  const token = await obterToken(c);
  const resp = await fetch(SENDMAIL_ENDPOINT(c.remetente), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: assunto,
        body: { contentType: "HTML", content: corpoHtml },
        toRecipients: [{ emailAddress: { address: para } }],
      },
      saveToSentItems: false,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Microsoft Graph recusou o envio (HTTP ${resp.status}).`);
  }
}

export function emailConfigurado(): boolean {
  return lerCredenciais() !== null;
}

/** Escapa texto que vai interpolado no corpo HTML do e-mail. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

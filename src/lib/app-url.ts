/**
 * Origem pública da aplicação (protocolo + host), para montar links absolutos
 * que saem do processo — e-mail, principalmente.
 *
 * NUNCA derive isso do header `Host` da request: ele é escrito por quem chama.
 * Um pedido de recuperação de senha com `Host: evil.com` faria o e-mail chegar
 * à caixa da vítima com um link para o servidor do atacante, entregando o token.
 *
 * A fonte é a mesma que o next-auth usa (`AUTH_URL`), então o link do e-mail e
 * o callback de login nunca divergem. No Railway ela vale
 * `https://${{RAILWAY_PUBLIC_DOMAIN}}` — necessária porque o proxy entrega
 * `Host: localhost:8080` ao container.
 */
const FALLBACK_DEV = "http://localhost:3000";

export function appUrl(): string {
  const bruto = process.env.AUTH_URL?.trim();

  if (!bruto) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_URL não definida. Sem ela não há como montar links de e-mail confiáveis."
      );
    }
    return FALLBACK_DEV;
  }

  let url: URL;
  try {
    url = new URL(bruto);
  } catch {
    throw new Error(`AUTH_URL inválida: ${bruto}. Use uma URL absoluta, com protocolo.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`AUTH_URL com protocolo não suportado: ${url.protocol}`);
  }

  // origin já descarta path, query e barra final
  return url.origin;
}

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { enviarEmail, escapeHtml } from "@/lib/email";
import { appUrl } from "@/lib/app-url";

/** Quanto tempo o link de redefinição continua valendo. */
export const VALIDADE_MINUTOS = 60;

/** Só o hash vai para o banco — o token em claro existe apenas dentro do link. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Gera o token, invalida os anteriores do usuário e devolve o valor em claro
 * (que só aparece no e-mail). Nunca registre esse retorno em log.
 */
export async function gerarToken(usuarioId: string): Promise<string> {
  // um pedido novo cancela os links antigos
  await prisma.tokenSenha.updateMany({
    where: { usuarioId, usadoEm: null },
    data: { usadoEm: new Date() },
  });

  const token = randomBytes(32).toString("base64url");
  await prisma.tokenSenha.create({
    data: {
      usuarioId,
      tokenHash: hashToken(token),
      expiraEm: new Date(Date.now() + VALIDADE_MINUTOS * 60_000),
    },
  });
  return token;
}

type TokenValido = { id: string; usuarioId: string };

/** Devolve o token se existir, não tiver sido usado e não estiver vencido. */
export async function validarToken(token: string): Promise<TokenValido | null> {
  if (!token) return null;

  const registro = await prisma.tokenSenha.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, usuarioId: true, usadoEm: true, expiraEm: true, tokenHash: true },
  });
  if (!registro) return null;

  // comparação em tempo constante, embora a busca já tenha sido por hash
  const a = Buffer.from(registro.tokenHash, "hex");
  const b = Buffer.from(hashToken(token), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (registro.usadoEm) return null;
  if (registro.expiraEm.getTime() < Date.now()) return null;

  return { id: registro.id, usuarioId: registro.usuarioId };
}

/**
 * Consome o token e troca a senha. Tudo numa transação: se algo falhar, o
 * token continua válido e a senha não muda.
 */
export async function redefinirSenha(token: string, novaSenha: string): Promise<boolean> {
  const valido = await validarToken(token);
  if (!valido) return false;

  const senhaHash = await bcrypt.hash(novaSenha, 10);

  await prisma.$transaction(async (tx) => {
    // updateMany com usadoEm: null garante que dois pedidos simultâneos
    // não consigam usar o mesmo token duas vezes
    const consumido = await tx.tokenSenha.updateMany({
      where: { id: valido.id, usadoEm: null },
      data: { usadoEm: new Date() },
    });
    if (consumido.count === 0) throw new Error("Token já utilizado.");

    await tx.usuario.update({
      where: { id: valido.usuarioId },
      data: { senhaHash, senhaProvisoria: false },
    });

    // trocou a senha, derruba qualquer outro link pendente
    await tx.tokenSenha.updateMany({
      where: { usuarioId: valido.usuarioId, usadoEm: null },
      data: { usadoEm: new Date() },
    });
  });

  return true;
}

export async function enviarEmailRecuperacao(
  destinatario: string,
  nome: string,
  token: string
) {
  // A origem vem do ambiente, nunca de quem chamou — ver o comentário em app-url.ts.
  const link = `${appUrl()}/redefinir-senha/${token}`;
  const assunto = "Redefinição de senha — Sistema de Chamados";
  const corpoTexto =
    `Olá, ${nome}.\n\n` +
    `Recebemos um pedido para redefinir sua senha no Sistema de Chamados.\n` +
    `Acesse o link abaixo para escolher uma nova senha:\n\n${link}\n\n` +
    `O link vale por ${VALIDADE_MINUTOS} minutos e só pode ser usado uma vez.\n` +
    `Se não foi você que pediu, ignore esta mensagem — sua senha atual continua valendo.`;
  const corpoHtml = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;color:#1f2937;line-height:1.6">
      <p>Olá, ${escapeHtml(nome)}.</p>
      <p>Recebemos um pedido para redefinir sua senha no <strong>Sistema de Chamados</strong>.</p>
      <p style="margin:28px 0">
        <a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">
          Escolher nova senha
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px">
        O link vale por ${VALIDADE_MINUTOS} minutos e só pode ser usado uma vez.<br>
        Se não foi você que pediu, ignore esta mensagem — sua senha atual continua valendo.
      </p>
    </div>`;

  await enviarEmail({ para: destinatario, assunto, corpoHtml, corpoTexto });
}


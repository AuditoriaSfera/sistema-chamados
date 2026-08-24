import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ANEXO_MAX_TAMANHO_BYTES, type TipoAnexo } from "@/lib/constants";

// Em produção (Railway) aponte UPLOADS_ROOT para o mount do volume persistente,
// ex.: /app/uploads. Sem volume, o filesystem é efêmero e os anexos somem a cada deploy.
export const UPLOADS_ROOT = process.env.UPLOADS_ROOT
  ? path.resolve(process.env.UPLOADS_ROOT)
  : path.join(process.cwd(), "uploads");

const MIME_TO_TIPO: Record<string, TipoAnexo> = {
  "image/jpeg": "IMAGEM",
  "image/png": "IMAGEM",
  "image/webp": "IMAGEM",
  "image/gif": "IMAGEM",
  "application/pdf": "PDF",
  "video/mp4": "VIDEO",
  "video/quicktime": "VIDEO",
  "video/webm": "VIDEO",
};

/**
 * Resolve o caminho relativo gravado no banco para um caminho absoluto dentro
 * de UPLOADS_ROOT, ou null se escapar da pasta.
 *
 * Normaliza "\\" para "/": anexos salvos em dev no Windows ficaram gravados como
 * "chamadoId\\arquivo.png", e no Linux isso vira um único nome de arquivo em vez
 * de subpasta + arquivo — o download quebra silenciosamente.
 */
export function resolveAnexoPath(relativePath: string): string | null {
  const normalizado = relativePath.replace(/\\/g, "/");
  const fullPath = path.resolve(UPLOADS_ROOT, normalizado);
  const relativo = path.relative(UPLOADS_ROOT, fullPath);
  if (relativo.startsWith("..") || path.isAbsolute(relativo)) return null;
  return fullPath;
}

export function classifyAnexo(mimeType: string): TipoAnexo | null {
  return MIME_TO_TIPO[mimeType] ?? null;
}

export function validateAnexo(file: File): string | null {
  const tipo = classifyAnexo(file.type);
  if (!tipo) return `Tipo de arquivo não suportado: ${file.type || file.name}`;
  if (file.size > ANEXO_MAX_TAMANHO_BYTES[tipo]) {
    const maxMb = ANEXO_MAX_TAMANHO_BYTES[tipo] / (1024 * 1024);
    return `${file.name} excede o limite de ${maxMb}MB para ${tipo.toLowerCase()}`;
  }
  return null;
}

export async function saveAnexo(chamadoId: string, file: File) {
  const tipo = classifyAnexo(file.type)!;
  const dir = path.join(UPLOADS_ROOT, chamadoId);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const storedName = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(dir, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  return {
    tipo,
    nomeArquivo: file.name,
    path: `${chamadoId}/${storedName}`,
    tamanho: file.size,
  };
}

export async function deleteAnexoFile(relativePath: string) {
  const fullPath = resolveAnexoPath(relativePath);
  if (!fullPath) return;
  await unlink(fullPath).catch(() => {});
}

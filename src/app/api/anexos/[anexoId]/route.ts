import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessChamado } from "@/lib/permissions";
import { UPLOADS_ROOT } from "@/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  PDF: "application/pdf",
};

const EXT_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

export async function GET(_req: Request, { params }: { params: Promise<{ anexoId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { anexoId } = await params;
  const anexo = await prisma.anexo.findUnique({
    where: { id: anexoId },
    include: { chamado: true },
  });
  if (!anexo || anexo.apagadoEm) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  if (!canAccessChamado(session.user, anexo.chamado)) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  const fullPath = path.join(UPLOADS_ROOT, anexo.path);
  if (!fullPath.startsWith(UPLOADS_ROOT)) {
    return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  }

  const buffer = await readFile(fullPath);
  const ext = path.extname(anexo.nomeArquivo).toLowerCase();
  const contentType =
    CONTENT_TYPES[anexo.tipo] ?? EXT_CONTENT_TYPES[ext] ?? "application/octet-stream";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(anexo.nomeArquivo)}"`,
    },
  });
}

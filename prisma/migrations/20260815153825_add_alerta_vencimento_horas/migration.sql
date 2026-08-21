-- Aplicada em dev via `prisma db push` (aditiva, sem risco de dados).
ALTER TABLE "ConfigGeral" ADD COLUMN "alertaVencimentoHoras" INTEGER NOT NULL DEFAULT 4;

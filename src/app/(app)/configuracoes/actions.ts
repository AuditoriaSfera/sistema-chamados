"use server";

import { prisma } from "@/lib/db";
import { requireGerenciarAdministradores } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const configSchema = z.object({
  reaberturaPrazoDias: z.coerce.number().int().min(1).max(365),
  reaberturaSomenteAdmin: z.boolean(),
  alertaVencimentoHoras: z.coerce.number().int().min(0).max(999),
});

export async function updateConfigGeral(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const admin = await requireGerenciarAdministradores();
  const parsed = configSchema.safeParse({
    reaberturaPrazoDias: formData.get("reaberturaPrazoDias"),
    reaberturaSomenteAdmin: formData.get("reaberturaSomenteAdmin") === "on",
    alertaVencimentoHoras: formData.get("alertaVencimentoHoras"),
  });
  if (!parsed.success) {
    return { error: "Verifique os campos (prazo entre 1 e 365 dias, alerta entre 0 e 999 horas)." };
  }

  await prisma.configGeral.upsert({
    where: { id: "geral" },
    update: parsed.data,
    create: { id: "geral", ...parsed.data },
  });
  await logAudit("ConfigGeral", "geral", "ATUALIZAR", admin.id, parsed.data);

  revalidatePath("/configuracoes");
  return {};
}

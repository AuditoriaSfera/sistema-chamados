"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const email = formData.get("email") as string;
  const senha = formData.get("senha") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/tickets";

  try {
    await signIn("credentials", { email, senha, redirectTo: callbackUrl });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Usuário ou senha inválidos." };
    }
    throw error;
  }
}

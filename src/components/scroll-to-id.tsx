"use client";

import { useEffect } from "react";

/** Rola a linha destacada (id do elemento) pra dentro da tela — sem isso, numa lista longa
 * ordenada alfabeticamente/por data, o item recém-criado pode ficar fora da área visível. */
export function ScrollToId({ id }: { id: string | undefined }) {
  useEffect(() => {
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [id]);

  return null;
}

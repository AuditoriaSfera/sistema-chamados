import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CONECTORES_NOME = new Set(["de", "da", "do", "das", "dos", "e"]);

/** "joão DA silva" -> "João da Silva". Conectores ficam minúsculos, exceto na primeira palavra. */
export function capitalizarNome(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .map((palavra, i) => {
      const minuscula = palavra.toLocaleLowerCase("pt-BR");
      if (i > 0 && CONECTORES_NOME.has(minuscula)) return minuscula;
      return minuscula.charAt(0).toUpperCase() + minuscula.slice(1);
    })
    .join(" ");
}

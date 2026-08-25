"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Campo de senha com botão para revelar o que está sendo digitado.
 *
 * Sem isso, um erro de digitação (ou o Caps Lock ligado) só aparece na hora de
 * entrar — e no formulário de troca de senha nem aparece, porque a confirmação
 * repete o mesmo engano.
 */
function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const [visivel, setVisivel] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visivel ? "text" : "password"}
        // O Edge injeta o próprio botão de revelar senha (::-ms-reveal) em
        // campos type="password"; sem escondê-lo aparecem dois olhos lado a lado.
        className={cn("pr-9 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden", className)}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        // tabIndex -1 mantém o Tab indo direto do campo para o botão de enviar
        tabIndex={-1}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visivel}
        title={visivel ? "Ocultar senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        {visivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export { PasswordInput };

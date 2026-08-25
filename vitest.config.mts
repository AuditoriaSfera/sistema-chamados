import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Sem TZ fixo, os testes de calendário e de data passavam com o fuso da
    // máquina de quem rodava — dev em São Paulo e container em UTC concordavam
    // por acaso. Fixar aqui faz a divergência aparecer no teste, não em produção.
    env: { TZ: "America/Sao_Paulo" },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});

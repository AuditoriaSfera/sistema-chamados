import { describe, it, expect, afterEach } from "vitest";
import { appUrl } from "./app-url";

const AUTH_URL_ORIGINAL = process.env.AUTH_URL;
const NODE_ENV_ORIGINAL = process.env.NODE_ENV;

function setEnv(authUrl: string | undefined, nodeEnv: string) {
  if (authUrl === undefined) delete process.env.AUTH_URL;
  else process.env.AUTH_URL = authUrl;
  // NODE_ENV é readonly no tipo, mas gravável em runtime
  (process.env as Record<string, string>).NODE_ENV = nodeEnv;
}

afterEach(() => {
  setEnv(AUTH_URL_ORIGINAL, NODE_ENV_ORIGINAL ?? "test");
});

describe("appUrl", () => {
  it("usa AUTH_URL quando definida", () => {
    setEnv("https://chamados.exemplo.com", "production");
    expect(appUrl()).toBe("https://chamados.exemplo.com");
  });

  it("descarta path, query e barra final", () => {
    setEnv("https://chamados.exemplo.com/algum/caminho?x=1", "production");
    expect(appUrl()).toBe("https://chamados.exemplo.com");
  });

  it("preserva porta não padrão", () => {
    setEnv("http://localhost:3000", "development");
    expect(appUrl()).toBe("http://localhost:3000");
  });

  it("ignora espaços em volta do valor", () => {
    setEnv("  https://chamados.exemplo.com  ", "production");
    expect(appUrl()).toBe("https://chamados.exemplo.com");
  });

  it("em produção, falha alto se AUTH_URL não existir", () => {
    setEnv(undefined, "production");
    expect(() => appUrl()).toThrow(/AUTH_URL não definida/);
  });

  it("em desenvolvimento, cai no localhost", () => {
    setEnv(undefined, "development");
    expect(appUrl()).toBe("http://localhost:3000");
  });

  it("recusa AUTH_URL sem protocolo", () => {
    // erro clássico: colar ${{RAILWAY_PUBLIC_DOMAIN}} sem o https:// na frente
    setEnv("chamados.exemplo.com", "production");
    expect(() => appUrl()).toThrow(/inválida/);
  });

  it("recusa referência do Railway não resolvida", () => {
    setEnv("${{RAILWAY_PUBLIC_DOMAIN}}", "production");
    expect(() => appUrl()).toThrow(/inválida/);
  });

  it("recusa protocolo que não seja http nem https", () => {
    setEnv("javascript:alert(1)", "production");
    expect(() => appUrl()).toThrow(/protocolo não suportado/);
  });

  it("não tem como o header Host influenciar o resultado", () => {
    // O contrato desta função é depender só do ambiente. Se um dia alguém voltar
    // a derivar a origem da request, este teste continua verde mas o de cima
    // ("falha alto") quebra — é lá que a regressão aparece.
    setEnv("https://chamados.exemplo.com", "production");
    expect(appUrl()).toBe("https://chamados.exemplo.com");
    expect(appUrl()).not.toContain("localhost");
  });
});

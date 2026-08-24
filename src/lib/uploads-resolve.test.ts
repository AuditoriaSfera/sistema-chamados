import { describe, it, expect } from "vitest";
import path from "node:path";

process.env.UPLOADS_ROOT = "/app/uploads";
const { resolveAnexoPath, UPLOADS_ROOT } = await import("./uploads");

// UPLOADS_ROOT passa por path.resolve, que normaliza conforme o SO: "/app/uploads"
// no Linux (produção) e "C:\app\uploads" no Windows (dev). As asserções montam o
// esperado com path.join para o teste valer nos dois.
const ESPERADO = path.join(UPLOADS_ROOT, "cmsusgruk000l", "7266ade3.pdf");

describe("resolveAnexoPath", () => {
  it("resolve caminho estilo Windows (legado) para subpasta real", () => {
    expect(resolveAnexoPath("cmsusgruk000l\\7266ade3.pdf")).toBe(ESPERADO);
  });
  it("resolve caminho estilo POSIX (novo)", () => {
    expect(resolveAnexoPath("cmsusgruk000l/7266ade3.pdf")).toBe(ESPERADO);
  });
  it("legado e novo apontam para o mesmo arquivo", () => {
    expect(resolveAnexoPath("cmsusgruk000l\\7266ade3.pdf"))
      .toBe(resolveAnexoPath("cmsusgruk000l/7266ade3.pdf"));
  });
  it("bloqueia path traversal", () => {
    expect(resolveAnexoPath("../../etc/passwd")).toBeNull();
    expect(resolveAnexoPath("chamado/../../etc/passwd")).toBeNull();
  });
  it("bloqueia caminho absoluto", () => {
    expect(resolveAnexoPath("/etc/passwd")).toBeNull();
  });
  it("bloqueia irmão com mesmo prefixo (falha do startsWith antigo)", () => {
    expect(resolveAnexoPath("../uploads-secreto/x.png")).toBeNull();
  });
  it("UPLOADS_ROOT vem do ambiente", () => {
    expect(UPLOADS_ROOT).toBe(path.resolve("/app/uploads"));
  });
});

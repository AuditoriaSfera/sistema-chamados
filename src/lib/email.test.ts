import { describe, it, expect } from "vitest";
import { escapeHtml } from "./email";

describe("escapeHtml", () => {
  it("neutraliza tags no nome que vai para o corpo do e-mail", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("escapa aspas e e-comercial", () => {
    expect(escapeHtml(`Tom & Jerry's "casa"`)).toBe(
      "Tom &amp; Jerry&#39;s &quot;casa&quot;"
    );
  });

  it("preserva acentuação normal", () => {
    expect(escapeHtml("João Gonçalves de Assunção")).toBe("João Gonçalves de Assunção");
  });

  it("não mexe em texto sem caracteres especiais", () => {
    expect(escapeHtml("Leonardo Sobral")).toBe("Leonardo Sobral");
  });
});

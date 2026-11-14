import { describe, expect, it } from "vitest";
import { parseThemePreference, resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("usa a escolha explícita do Usuário, ignorando o sistema", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("em Sistema, acompanha o tema do sistema", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("parseThemePreference", () => {
  it("aceita os três valores válidos", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
  });

  it("cai em Sistema para ausente ou inválido", () => {
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference("roxo")).toBe("system");
  });
});

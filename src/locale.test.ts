import { describe, expect, it } from "vitest";
import { BUILT_IN_LOCALES, DEFAULT_LOCALE, matchLocale, resolveLocale } from "./locale.js";

describe("matchLocale", () => {
  it("matches an exact tag", () => {
    expect(matchLocale(["pt-BR"])).toBe("pt-BR");
  });

  it("is case-insensitive on an exact tag", () => {
    expect(matchLocale(["PT-br"])).toBe("pt-BR");
  });

  it("falls back to a bare-language match when no exact tag is supported", () => {
    // "pt-PT" is not bundled — the closest supported catalogue is "pt-BR".
    expect(matchLocale(["pt-PT"])).toBe("pt-BR");
  });

  it("prefers an exact match anywhere in the list over a looser one", () => {
    // "es-ES" is bundled outright; "pt-PT" is only a bare-language match for
    // "pt-BR" — the exact hit wins even though it is listed second.
    expect(matchLocale(["pt-PT", "es-ES"])).toBe("es-ES");
  });

  it("walks the whole preference list before giving up", () => {
    expect(matchLocale(["fr-FR", "de-DE", "es-ES"])).toBe("es-ES");
  });

  it("accepts an underscore-separated POSIX-style tag", () => {
    expect(matchLocale("pt_BR.UTF-8")).toBe("pt-BR");
  });

  it("returns undefined when nothing matches", () => {
    expect(matchLocale(["fr-FR", "de-DE"])).toBeUndefined();
    expect(matchLocale(undefined)).toBeUndefined();
    expect(matchLocale([])).toBeUndefined();
  });
});

describe("resolveLocale", () => {
  it("falls back to the default locale when nothing matches", () => {
    expect(resolveLocale(["fr-FR"])).toBe(DEFAULT_LOCALE);
  });

  it("returns the match when there is one", () => {
    expect(resolveLocale(["en-US"])).toBe("en-US");
  });
});

describe("matchLocale with contributed locales", () => {
  // The case a locale plugin exists for: pt-PT is not bundled, so a system set
  // to it lands on the Brazilian catalogue — until a plugin contributes pt-PT,
  // at which point the exact tag has to win.
  const withPtPT = [...BUILT_IN_LOCALES, "pt-PT"];

  it("prefers a contributed exact tag over a bundled bare-language match", () => {
    expect(matchLocale(["pt-PT"], BUILT_IN_LOCALES)).toBe("pt-BR");
    expect(matchLocale(["pt-PT"], withPtPT)).toBe("pt-PT");
  });

  it("still falls back to the bundled catalogue for a variant nobody contributed", () => {
    expect(matchLocale(["pt-AO"], withPtPT)).toBe("pt-BR");
  });
});

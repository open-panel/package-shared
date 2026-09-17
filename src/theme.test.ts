import { describe, expect, it } from "vitest";
import { contrastRatio, mix, parseHex, formatHex, readableInk, withAlpha } from "./color.js";
import {
  ThemeManifestSchema,
  THEME_COLOR_TOKENS,
  THEME_SHADOW_TOKENS,
  type ThemeToken,
} from "./theme.js";
import { deriveVariant, resolveTheme, themeAppearances } from "./theme-derive.js";
import { BUILT_IN_THEME } from "./theme-built-in.js";

// A theme file carries only what makes it a theme; version and author belong
// to the plugin.json that contributes it.
const DRACULA = {
  id: "dracula",
  name: "Dracula",
  appearance: "dark",
  palette: {
    background: "#282a36",
    surface: "#44475a",
    foreground: "#f8f8f2",
    dim: "#6272a4",
    accent: "#bd93f9",
    success: "#50fa7b",
    warning: "#ffb86c",
    danger: "#ff5555",
  },
} as const;

describe("colour maths", () => {
  it("round-trips hex through parse and format", () => {
    for (const hex of ["#282a36", "#ffffff", "#000000", "#bd93f9"]) {
      expect(formatHex(parseHex(hex))).toBe(hex);
    }
  });

  it("expands shorthand hex", () => {
    expect(formatHex(parseHex("#abc"))).toBe("#aabbcc");
  });

  it("keeps alpha through parse and format", () => {
    expect(formatHex(parseHex("#282a3680"))).toBe("#282a3680");
  });

  it("rejects anything that is not a hex colour", () => {
    // The schema leans on this to keep url() and var() out of a theme file.
    for (const value of ["red", "rgb(1,2,3)", "url(x)", "#12345", ""]) {
      expect(() => parseHex(value)).toThrow();
    }
  });

  it("mixes toward the far end monotonically", () => {
    const steps = [0, 0.25, 0.5, 0.75, 1].map((t) => mix("#000000", "#ffffff", t));
    expect(steps.at(0)).toBe("#000000");
    expect(steps.at(-1)).toBe("#ffffff");
    for (let i = 1; i < steps.length; i++) {
      expect(contrastRatio(steps[i]!, "#000000")).toBeGreaterThan(
        contrastRatio(steps[i - 1]!, "#000000"),
      );
    }
  });

  it("computes the WCAG reference ratio for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("picks dark ink for a yellow ground and light ink for a navy one", () => {
    // The case that makes hardcoding white a bug rather than a shortcut.
    expect(readableInk("#f5e663", ["#ffffff", "#1c1b19"])).toBe("#1c1b19");
    expect(readableInk("#1a2b6b", ["#ffffff", "#1c1b19"])).toBe("#ffffff");
  });

  it("applies alpha as an eight-digit hex", () => {
    expect(withAlpha("#bd93f9", 0.2)).toBe("#bd93f933");
  });
});

describe("manifest schema", () => {
  it("accepts the shorthand form and normalises it into variants", () => {
    const manifest = ThemeManifestSchema.parse(DRACULA);
    expect(manifest.variants.dark?.palette.accent).toBe("#bd93f9");
    expect(manifest.variants.light).toBeUndefined();
    expect(themeAppearances(manifest)).toEqual(["dark"]);
  });

  it("accepts the full two-variant form", () => {
    const manifest = ThemeManifestSchema.parse(BUILT_IN_THEME);
    expect(themeAppearances(manifest)).toEqual(["dark", "light"]);
  });

  it("rejects a non-hex colour anywhere in the palette", () => {
    const attack = {
      ...DRACULA,
      palette: { ...DRACULA.palette, background: "url(https://example.test/pixel.png)" },
    };
    expect(() => ThemeManifestSchema.parse(attack)).toThrow();
  });

  it("rejects an unknown token override", () => {
    const attack = { ...DRACULA, tokens: { "not-a-token": "#ffffff" } };
    expect(() => ThemeManifestSchema.parse(attack)).toThrow();
  });

  it("rejects unknown top-level keys, so a theme cannot smuggle in fields", () => {
    expect(() => ThemeManifestSchema.parse({ ...DRACULA, css: "body{}" })).toThrow();
  });

  it("rejects a theme with no variants at all", () => {
    const { appearance: _appearance, palette: _palette, ...rest } = DRACULA;
    expect(() => ThemeManifestSchema.parse({ ...rest, variants: {} })).toThrow();
  });

  it("rejects an id that is not a slug", () => {
    expect(() => ThemeManifestSchema.parse({ ...DRACULA, id: "Not A Slug" })).toThrow();
  });
});

describe("derivation", () => {
  const dracula = ThemeManifestSchema.parse(DRACULA);

  it("produces every token the desktop paints, and nothing else", () => {
    const { tokens } = deriveVariant(dracula.variants.dark!);
    const expected = [...THEME_COLOR_TOKENS, ...THEME_SHADOW_TOKENS].sort();
    expect(Object.keys(tokens).sort()).toEqual(expected);
  });

  it("emits concrete values, never a CSS function", () => {
    // color-mix() is unsupported in older WebView2 builds, which is why the
    // maths runs here rather than in the stylesheet.
    const { tokens } = deriveVariant(dracula.variants.dark!);
    for (const [name, value] of Object.entries(tokens)) {
      if (name.startsWith("shadow-")) continue;
      expect(value, name).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
    }
  });

  it("keeps the palette's own colours verbatim", () => {
    const { tokens } = deriveVariant(dracula.variants.dark!);
    expect(tokens.app).toBe("#282a36");
    expect(tokens.accent).toBe("#bd93f9");
    expect(tokens.danger).toBe("#ff5555");
  });

  it("raises surfaces away from the ground on a dark theme", () => {
    const { tokens } = deriveVariant(dracula.variants.dark!);
    const lift = (token: ThemeToken) => contrastRatio(tokens[token], tokens.app);
    expect(lift("panel")).toBeGreaterThan(1);
    expect(lift("raised")).toBeGreaterThan(lift("panel"));
    expect(lift("key-top")).toBeGreaterThan(lift("raised"));
  });

  it("raises surfaces away from the ground on a light theme too", () => {
    const { tokens } = deriveVariant(BUILT_IN_THEME.variants.light!);
    // The two-anchor model exists for this: on light, `panel` rises toward
    // white while `hover` falls toward ink, and both must still separate.
    expect(contrastRatio(tokens.panel, tokens.app)).toBeGreaterThan(1);
    expect(contrastRatio(tokens.hover, tokens.panel)).toBeGreaterThan(1);
    expect(contrastRatio(tokens.line, tokens.panel)).toBeGreaterThan(1);
  });

  it("holds the text tiers to their contrast floor", () => {
    for (const manifest of [dracula, BUILT_IN_THEME]) {
      for (const variant of Object.values(manifest.variants)) {
        if (!variant) continue;
        const { tokens } = deriveVariant(variant);
        expect(contrastRatio(tokens.fg, tokens.app)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(tokens["fg-muted"], tokens.app)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(tokens["fg-subtle"], tokens.app)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("corrects an unreadable dim colour and names the token it moved", () => {
    const nearInvisible = {
      ...dracula.variants.dark!,
      palette: { ...dracula.variants.dark!.palette, dim: "#2c2e3a" },
    };
    const { tokens, warnings } = deriveVariant(nearInvisible);
    expect(warnings).toContain("fg-muted");
    expect(contrastRatio(tokens["fg-muted"], tokens.app)).toBeGreaterThanOrEqual(4.5);
  });

  it("reports no warnings for a palette that already passes", () => {
    expect(deriveVariant(BUILT_IN_THEME.variants.dark!).warnings).toEqual([]);
  });

  it("lifts Dracula's comment colour into readability and says so", () => {
    // The instructive case, on the most-published palette there is: Dracula's
    // "Comment" is 3.03:1 against its background, which is right for text
    // meant to recede in an editor and short of the 4.5:1 a field label or a
    // device name needs here. The floor corrects it and names both tokens, so
    // the author can see the app did not render their palette verbatim.
    const { tokens, warnings } = deriveVariant(dracula.variants.dark!);
    expect(warnings).toEqual(["fg-muted", "fg-subtle"]);
    expect(contrastRatio("#6272a4", "#282a36")).toBeLessThan(4.5);
    expect(contrastRatio(tokens["fg-muted"], tokens.app)).toBeGreaterThanOrEqual(4.5);
    // Corrected in lightness only, so the palette's hue survives the fix.
    expect(tokens["fg-muted"]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("picks accent ink by contrast rather than defaulting to white", () => {
    const yellow = {
      ...dracula.variants.dark!,
      palette: { ...dracula.variants.dark!.palette, accent: "#f1fa8c" },
    };
    const { tokens } = deriveVariant(yellow);
    expect(contrastRatio(tokens["accent-fg"], tokens.accent)).toBeGreaterThan(4.5);
  });

  it("lets an override beat the derived value", () => {
    const pinned = { ...dracula.variants.dark!, tokens: { "key-top": "#123456" } };
    expect(deriveVariant(pinned).tokens["key-top"]).toBe("#123456");
  });

  it("falls back to the only variant a single-appearance theme has", () => {
    // Asking a dark-only theme for light must not produce an unstyled app.
    const resolved = resolveTheme(dracula, "light");
    expect(resolved.appearance).toBe("dark");
    expect(resolved.tokens.app).toBe("#282a36");
  });

  it("serves each appearance of a two-variant theme separately", () => {
    const dark = resolveTheme(BUILT_IN_THEME, "dark");
    const light = resolveTheme(BUILT_IN_THEME, "light");
    expect(dark.appearance).toBe("dark");
    expect(light.appearance).toBe("light");
    expect(contrastRatio(light.tokens.app!, "#ffffff")).toBeLessThan(
      contrastRatio(dark.tokens.app!, "#ffffff"),
    );
  });
});

import { z } from "zod";
import { isHexColor } from "./color.js";

/**
 * Themes are *data*, never code (see docs/THEMES.md).
 *
 * A theme cannot ship CSS, because CSS inside the webview reaches the network
 * (`url()`, `@import`) from a document that also holds an IPC channel to the
 * daemon. So a theme is a closed set of named colours: the schema below
 * rejects any key it does not know and any value that is not a plain hex
 * colour, which leaves a theme author no way to express anything but colour.
 *
 * The other half of the design is that nobody wants to fill in 31 tokens. A
 * theme declares eight palette colours and the derivation in theme-derive.ts
 * produces the rest; `tokens` is the escape hatch for authors who want to
 * place a specific one by hand.
 */

/** Everything the desktop paints, minus the two shadows, which are composed rather than authored. */
export const THEME_COLOR_TOKENS = [
  // Surfaces, darkest (or lightest) first — the elevation ramp.
  "app",
  "panel",
  "raised",
  "hover",
  "active",
  // Separators.
  "line",
  "line-strong",
  // Text.
  "fg",
  "fg-muted",
  "fg-subtle",
  // Accent.
  "accent",
  "accent-hover",
  "accent-fg",
  "accent-soft",
  // Status.
  "success",
  "success-soft",
  "warn",
  "warn-soft",
  "danger",
  "danger-soft",
  // The deck's plate.
  "plate",
  "plate-line",
  "plate-sheen",
  // The keycaps.
  "key-top",
  "key-bottom",
  "key-line",
  "key-empty",
  "key-sheen",
  "key-drop",
] as const;

export type ThemeColorToken = (typeof THEME_COLOR_TOKENS)[number];

/** Composed from `palette.shadow` rather than authored, so overrides stay purely hex. */
export const THEME_SHADOW_TOKENS = ["shadow-pop", "shadow-plate"] as const;
export type ThemeShadowToken = (typeof THEME_SHADOW_TOKENS)[number];

export type ThemeToken = ThemeColorToken | ThemeShadowToken;

const HexColorSchema = z
  .string()
  .refine(isHexColor, "must be a hex colour such as #282a36 or #282a36cc");

/**
 * The eight colours a theme actually writes. Named after what they are in the
 * interface rather than after a scale position, so the mapping from a
 * published palette is obvious: Dracula's "Current Line" is `surface`, its
 * "Comment" is `dim`.
 */
export const ThemePaletteSchema = z
  .object({
    /** The window's ground, and the bottom of the elevation ramp. */
    background: HexColorSchema,
    /** The raised end of the ramp: panels, keycaps and borders interpolate toward it. */
    surface: HexColorSchema,
    /** Primary text. */
    foreground: HexColorSchema,
    /** Secondary text, and the source of the subtle tier below it. */
    dim: HexColorSchema,
    /** Selection, focus, and the pressed key. The one colour that means "here". */
    accent: HexColorSchema,
    success: HexColorSchema,
    warning: HexColorSchema,
    danger: HexColorSchema,
    /** What shadows are cast in. Defaults to black on dark themes, a desaturated ink on light. */
    shadow: HexColorSchema.optional(),
  })
  .strict();

export type ThemePalette = z.infer<typeof ThemePaletteSchema>;

/**
 * Not a label: `appearance` selects the derivation profile. Sheen and drop
 * shadow invert between the two — a keycap catches white light on a dark theme
 * and casts a dark edge on a light one — so a theme cannot be rendered without
 * knowing which world it lives in.
 */
export const ThemeAppearanceSchema = z.enum(["dark", "light"]);
export type ThemeAppearance = z.infer<typeof ThemeAppearanceSchema>;

const TokenOverridesSchema = z
  .record(z.enum(THEME_COLOR_TOKENS), HexColorSchema)
  .describe("Individual derived tokens to place by hand.");

export const ThemeVariantSchema = z
  .object({
    appearance: ThemeAppearanceSchema,
    palette: ThemePaletteSchema,
    tokens: TokenOverridesSchema.optional(),
  })
  .strict();

export type ThemeVariant = z.infer<typeof ThemeVariantSchema>;

/**
 * Lower-case slug. Also the filename people will reach for, and the key the
 * active-theme preference stores, so it has to stay stable across edits.
 */
export const ThemeIdSchema = z
  .string()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/, "must be a lower-case slug, e.g. dracula");

const VariantsSchema = z
  .object({
    dark: ThemeVariantSchema.optional(),
    light: ThemeVariantSchema.optional(),
  })
  .strict()
  .refine((variants) => variants.dark ?? variants.light, {
    message: "a theme needs at least one of variants.dark or variants.light",
  });

/**
 * A theme file carries only what makes it a theme: which one it is, and what
 * it looks like. Version, author and homepage belong to the plugin that
 * contributes it (plugin.json) — one place for identity, so the two can never
 * disagree about who wrote a theme.
 */
const ManifestBaseSchema = z.object({
  id: ThemeIdSchema,
  name: z.string().min(1).max(48),
});

/**
 * The full form. Most themes only have one appearance, so the shorthand below
 * lets them write `appearance` + `palette` at the top level instead of nesting
 * a single-key `variants` object — which is the difference between an
 * eight-line theme file and a fifteen-line one.
 */
const FullManifestSchema = ManifestBaseSchema.extend({ variants: VariantsSchema }).strict();

const ShorthandManifestSchema = ManifestBaseSchema.extend({
  appearance: ThemeAppearanceSchema,
  palette: ThemePaletteSchema,
  tokens: TokenOverridesSchema.optional(),
}).strict();

export const ThemeManifestSchema = z
  .union([FullManifestSchema, ShorthandManifestSchema])
  .transform((manifest) => {
    if ("variants" in manifest) return manifest;
    const { appearance, palette, tokens, ...rest } = manifest;
    return { ...rest, variants: { [appearance]: { appearance, palette, tokens } } };
  })
  // Re-validated after the transform so both spellings converge on one shape,
  // and a caller can trust `manifest.variants` exists without narrowing.
  .pipe(FullManifestSchema);

export type ThemeManifest = z.infer<typeof ThemeManifestSchema>;

/**
 * A variant with every token resolved to a concrete value — what actually
 * crosses IPC. The desktop writes these straight onto the document element and
 * holds no colour logic of its own.
 */
export const ResolvedThemeSchema = z.object({
  id: ThemeIdSchema,
  name: z.string(),
  appearance: ThemeAppearanceSchema,
  // Keyed by the closed token set rather than by string, so the wire format
  // itself enforces that a resolved theme is complete — a daemon that dropped
  // a token would fail validation here instead of half-painting the window.
  tokens: z.record(z.enum([...THEME_COLOR_TOKENS, ...THEME_SHADOW_TOKENS]), z.string()),
  /** Tokens the contrast floor had to correct, named so an author can fix the palette. */
  warnings: z.array(z.string()),
});

export type ResolvedTheme = z.infer<typeof ResolvedThemeSchema>;

/**
 * What Settings → Appearance lists. Version, author and homepage come from the
 * contributing plugin's manifest rather than the theme file, which is why they
 * are optional here: a built-in has no plugin behind it.
 */
export const ThemeSummarySchema = z.object({
  id: ThemeIdSchema,
  name: z.string(),
  version: z.string().optional(),
  author: z.string().optional(),
  homepage: z.string().optional(),
  /** Which appearances this theme can render; drives whether the mode toggle is offered. */
  appearances: z.array(ThemeAppearanceSchema).min(1),
  /** Built-in themes ship with the app and are always present, even with no daemon. */
  builtIn: z.boolean(),
});

export type ThemeSummary = z.infer<typeof ThemeSummarySchema>;

/**
 * "system" follows the OS. The daemon stores it verbatim and the desktop
 * resolves it against `prefers-color-scheme`, which is the only side that can
 * see the OS setting.
 */
export const ThemeModeSchema = z.enum(["system", "dark", "light"]);
export type ThemeMode = z.infer<typeof ThemeModeSchema>;

export const ThemePreferenceSchema = z.object({
  themeId: ThemeIdSchema,
  mode: ThemeModeSchema,
});

export type ThemePreference = z.infer<typeof ThemePreferenceSchema>;

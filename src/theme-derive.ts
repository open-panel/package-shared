import {
  adjustLightness,
  contrastRatio,
  ensureContrast,
  mix,
  readableInk,
  withAlpha,
} from "./color.js";
import type {
  ResolvedTheme,
  ThemeAppearance,
  ThemeManifest,
  ThemeToken,
  ThemeVariant,
} from "./theme.js";

/**
 * Eight palette colours in, thirty-one tokens out.
 *
 * Every derived colour is an interpolation toward one of two anchors, and
 * which anchor a token uses is the whole design:
 *
 *   material (`palette.surface`) — what furniture is *made of*. Panels, cards
 *     and keycaps move toward it, and on both appearances that means "lighter
 *     than the window", because a raised object catches more light.
 *
 *   contrast (`palette.foreground`) — the opposite pole from the ground.
 *     Hover, active, separators and the recessed plate move toward it, which
 *     lightens on a dark theme and darkens on a light one *by construction*,
 *     since the foreground is always across the page from the background.
 *
 * A single ramp cannot do both: on a light theme a panel goes up toward white
 * while its hover state goes down toward ink. Splitting the anchors is what
 * lets one derivation serve both worlds. The percentages still differ per
 * appearance — a light theme's panel sits far nearer to white than a dark
 * theme's does to its surface — so they live in the profile below.
 */

interface Ramp {
  panel: number;
  raised: number;
  hover: number;
  active: number;
  line: number;
  lineStrong: number;
  plate: number;
  plateLine: number;
  keyBottom: number;
  keyTop: number;
  keyLine: number;
}

interface AppearanceProfile {
  ramp: Ramp;
  /** Lightness step a hover state takes to move *away* from the ground. */
  accentStep: number;
  sheenAlpha: number;
  plateSheenAlpha: number;
  keyEmptyAlpha: number;
  dropAlpha: number;
  defaultShadow: string;
}

const PROFILES: Record<ThemeAppearance, AppearanceProfile> = {
  // A dark chassis: panels lift only slightly off the ground, and each keycap
  // catches a thin white highlight over a hard black drop.
  dark: {
    ramp: {
      panel: 0.18,
      raised: 0.34,
      hover: 0.09,
      active: 0.16,
      line: 0.13,
      lineStrong: 0.26,
      plate: 0.035,
      plateLine: 0.16,
      keyBottom: 0.48,
      keyTop: 0.8,
      keyLine: 0.12,
    },
    accentStep: 0.05,
    sheenAlpha: 0.07,
    plateSheenAlpha: 0.04,
    keyEmptyAlpha: 0.022,
    dropAlpha: 0.4,
    defaultShadow: "#000000",
  },
  // A light one inverts the relationship: panels run most of the way to white,
  // the sheen is near-opaque, and the drop is a desaturated ink rather than
  // black, which on paper reads as dirt.
  light: {
    ramp: {
      panel: 0.7,
      raised: 1,
      hover: 0.05,
      active: 0.11,
      line: 0.14,
      lineStrong: 0.3,
      plate: 0.05,
      plateLine: 0.13,
      keyBottom: 0.3,
      keyTop: 1,
      keyLine: 0.16,
    },
    accentStep: -0.05,
    sheenAlpha: 0.9,
    plateSheenAlpha: 0.7,
    keyEmptyAlpha: 0.55,
    dropAlpha: 0.14,
    defaultShadow: "#14181f",
  },
};

/** Alpha for the `-soft` status fills and the accent wash behind a selected key. */
const SOFT_ALPHA = 0.12;
const ACCENT_SOFT_ALPHA = 0.2;

/** WCAG floors the derived text tiers are held to against `app`. */
const FG_MIN_CONTRAST = 4.5;
const MUTED_MIN_CONTRAST = 4.5;
const SUBTLE_MIN_CONTRAST = 3;

export interface DerivedVariant {
  tokens: Record<ThemeToken, string>;
  /** Names of tokens the contrast floor had to move, for the author to see. */
  warnings: string[];
}

/**
 * Resolves one variant. Pure and synchronous, so both sides of the IPC
 * boundary can run it — the daemon does, and the desktop keeps it only for the
 * built-in fallback it paints before the daemon is reachable.
 */
export function deriveVariant(variant: ThemeVariant): DerivedVariant {
  const { palette, appearance } = variant;
  const profile = PROFILES[appearance];
  const { ramp } = profile;
  const warnings: string[] = [];

  const material = palette.surface;
  const contrast = palette.foreground;

  const app = palette.background;
  const panel = mix(app, material, ramp.panel);
  const plate = mix(app, contrast, ramp.plate);
  const keyTop = mix(app, material, ramp.keyTop);

  // Text is held to a floor rather than trusted: a palette whose `dim` sits
  // close to its `background` is a perfectly good editor comment colour and an
  // unreadable subtitle under a device name.
  const held = (value: string, min: number, token: string): string => {
    const corrected = ensureContrast(value, app, min);
    if (corrected !== value) warnings.push(token);
    return corrected;
  };

  const fg = held(palette.foreground, FG_MIN_CONTRAST, "fg");
  const fgMuted = held(palette.dim, MUTED_MIN_CONTRAST, "fg-muted");
  const fgSubtle = held(
    mix(palette.dim, palette.background, 0.38),
    SUBTLE_MIN_CONTRAST,
    "fg-subtle",
  );

  const accent = palette.accent;
  const shadow = palette.shadow ?? profile.defaultShadow;
  const sheen = "#ffffff";

  const tokens: Record<ThemeToken, string> = {
    app,
    panel,
    raised: mix(app, material, ramp.raised),
    // Interactive states are measured from the panel they sit on, not from the
    // window, so a hovered row in a side panel lifts off *that* surface.
    hover: mix(panel, contrast, ramp.hover),
    active: mix(panel, contrast, ramp.active),

    line: mix(panel, contrast, ramp.line),
    "line-strong": mix(panel, contrast, ramp.lineStrong),

    fg,
    "fg-muted": fgMuted,
    "fg-subtle": fgSubtle,

    accent,
    "accent-hover": adjustLightness(accent, profile.accentStep),
    // Never hardcoded white: an accent in the yellow or lime band needs dark
    // ink, and every theme picking one would otherwise ship unreadable buttons.
    "accent-fg": readableInk(accent, ["#ffffff", palette.background, fg]),
    "accent-soft": withAlpha(accent, ACCENT_SOFT_ALPHA),

    success: palette.success,
    "success-soft": withAlpha(palette.success, SOFT_ALPHA),
    warn: palette.warning,
    "warn-soft": withAlpha(palette.warning, SOFT_ALPHA),
    danger: palette.danger,
    "danger-soft": withAlpha(palette.danger, SOFT_ALPHA),

    plate,
    "plate-line": mix(plate, contrast, ramp.plateLine),
    "plate-sheen": withAlpha(sheen, profile.plateSheenAlpha),

    "key-top": keyTop,
    "key-bottom": mix(app, material, ramp.keyBottom),
    "key-line": mix(keyTop, contrast, ramp.keyLine),
    "key-empty": withAlpha(sheen, profile.keyEmptyAlpha),
    "key-sheen": withAlpha(sheen, profile.sheenAlpha),
    "key-drop": withAlpha(shadow, profile.dropAlpha),

    // Composed, not authored: a box-shadow is geometry plus a colour, and
    // letting a theme write the geometry would reopen the arbitrary-CSS hole
    // the whole schema exists to close.
    "shadow-pop": `0 10px 30px -8px ${withAlpha(shadow, 0.6)}, 0 2px 8px -2px ${withAlpha(shadow, 0.5)}`,
    "shadow-plate": `0 22px 44px -28px ${withAlpha(shadow, 0.9)}`,
  };

  // Author overrides land last so they beat every derived value, including the
  // contrast correction above — someone who places a token by hand has said
  // what they want more precisely than the palette could.
  for (const [token, value] of Object.entries(variant.tokens ?? {})) {
    tokens[token as ThemeToken] = value;
  }

  return { tokens, warnings };
}

/**
 * Picks the variant for `appearance`, falling back to whichever one a
 * single-appearance theme has. Undefined only for a manifest with no variants,
 * which the schema already rejects.
 */
export function selectVariant(
  manifest: ThemeManifest,
  appearance: ThemeAppearance,
): ThemeVariant | undefined {
  return manifest.variants[appearance] ?? manifest.variants.dark ?? manifest.variants.light;
}

export function resolveTheme(manifest: ThemeManifest, appearance: ThemeAppearance): ResolvedTheme {
  const variant = selectVariant(manifest, appearance);
  if (!variant) throw new Error(`Theme "${manifest.id}" has no variants`);
  const { tokens, warnings } = deriveVariant(variant);
  return { id: manifest.id, name: manifest.name, appearance: variant.appearance, tokens, warnings };
}

/** Which appearances a theme can render, for the UI's mode toggle. */
export function themeAppearances(manifest: ThemeManifest): ThemeAppearance[] {
  const available: ThemeAppearance[] = [];
  if (manifest.variants.dark) available.push("dark");
  if (manifest.variants.light) available.push("light");
  return available;
}

export { contrastRatio };

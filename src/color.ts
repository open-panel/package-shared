/**
 * The colour maths the theme system derives palettes with (see theme-derive.ts).
 *
 * Everything works in OKLab/OKLCH rather than sRGB: mixing two greys in sRGB
 * walks through a muddy middle and lightening a saturated hue shifts it, both
 * of which are visible on a 15-key grid of flat colour. OKLab is perceptually
 * uniform, so "18% of the way from the background to the surface" means the
 * same visual step regardless of which two colours a theme author picked.
 *
 * Deliberately dependency-free and browser-safe: this module has to run in the
 * daemon (deriving a theme to send over IPC) and in the webview (applying the
 * built-in fallback before the daemon is reachable).
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
  /** 0–1. Carried through the maths untouched — only parse/format read it. */
  a: number;
}

export interface Oklab {
  L: number;
  a: number;
  b: number;
  alpha: number;
}

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isHexColor(value: string): boolean {
  return HEX_PATTERN.test(value);
}

/** Accepts #rgb, #rgba, #rrggbb and #rrggbbaa. Throws on anything else. */
export function parseHex(hex: string): Rgb {
  if (!isHexColor(hex)) throw new Error(`Not a hex colour: ${hex}`);
  let body = hex.slice(1);
  if (body.length <= 4) body = [...body].map((char) => char + char).join("");
  const int = Number.parseInt(body, 16);
  const hasAlpha = body.length === 8;
  return {
    r: ((hasAlpha ? int >>> 24 : int >>> 16) & 0xff) / 255,
    g: ((hasAlpha ? int >>> 16 : int >>> 8) & 0xff) / 255,
    b: ((hasAlpha ? int >>> 8 : int) & 0xff) / 255,
    a: hasAlpha ? (int & 0xff) / 255 : 1,
  };
}

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

const channel = (value: number): string =>
  Math.round(clamp01(value) * 255)
    .toString(16)
    .padStart(2, "0");

/** Always lower-case, always 6 or 8 digits — the form the CSS custom properties carry. */
export function formatHex({ r, g, b, a }: Rgb): string {
  const base = `#${channel(r)}${channel(g)}${channel(b)}`;
  return a >= 1 ? base : `${base}${channel(a)}`;
}

// --- sRGB <-> OKLab (Björn Ottosson's matrices) ------------------------------

const toLinear = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const toGamma = (value: number): number =>
  value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;

export function rgbToOklab({ r, g, b, a }: Rgb): Oklab {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    alpha: a,
  };
}

export function oklabToRgb({ L, a, b, alpha }: Oklab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return {
    r: clamp01(toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: clamp01(toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    b: clamp01(toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
    a: alpha,
  };
}

// --- operations the derivation uses ------------------------------------------

/**
 * `amount` of 0 returns `from`, 1 returns `to`. This is the single operation
 * the elevation ramp is built from: every surface, line, plate and keycap
 * colour is a stop between a theme's `background` and its `surface`.
 */
export function mix(from: string, to: string, amount: number): string {
  const a = rgbToOklab(parseHex(from));
  const b = rgbToOklab(parseHex(to));
  const t = clamp01(amount);
  return formatHex(
    oklabToRgb({
      L: a.L + (b.L - a.L) * t,
      a: a.a + (b.a - a.a) * t,
      b: a.b + (b.b - a.b) * t,
      alpha: a.alpha + (b.alpha - a.alpha) * t,
    }),
  );
}

/** Shifts perceptual lightness, leaving hue and chroma alone. */
export function adjustLightness(hex: string, delta: number): string {
  const lab = rgbToOklab(parseHex(hex));
  return formatHex(oklabToRgb({ ...lab, L: clamp01(lab.L + delta) }));
}

export function withAlpha(hex: string, alpha: number): string {
  return formatHex({ ...parseHex(hex), a: clamp01(alpha) });
}

/** WCAG 2.1 relative luminance, which needs linear-light sRGB rather than OKLab. */
function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). Ignores alpha. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(parseHex(a));
  const lb = relativeLuminance(parseHex(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Pushes `foreground` away from `background` in lightness until it clears
 * `ratio`, or gives up at the end of the scale and returns the best it reached.
 *
 * A theme author picking, say, a comment colour close to their background is
 * making a reasonable choice for a code editor and an unreadable one for a
 * subtitle under a device name. Rather than reject the palette, the derivation
 * corrects the token and reports it (see deriveTheme's `warnings`).
 */
export function ensureContrast(foreground: string, background: string, ratio: number): string {
  if (contrastRatio(foreground, background) >= ratio) return foreground;

  const lab = rgbToOklab(parseHex(foreground));
  // Move toward whichever end of the scale is further from the background, so
  // light text on a dark ground gets lighter rather than crossing over it.
  const direction = rgbToOklab(parseHex(background)).L > 0.5 ? -1 : 1;

  let best = foreground;
  for (let step = 1; step <= 100; step++) {
    const candidate = formatHex(
      oklabToRgb({ ...lab, L: clamp01(lab.L + direction * step * 0.01) }),
    );
    best = candidate;
    if (contrastRatio(candidate, background) >= ratio) return candidate;
  }
  return best;
}

/**
 * The readable ink for text sitting on `background`, chosen between the
 * candidates by contrast. Hardcoding white here is what makes a yellow or
 * lime accent unreadable the moment someone themes with one.
 */
export function readableInk(background: string, candidates: string[]): string {
  let best = candidates[0] ?? "#ffffff";
  let bestRatio = 0;
  for (const candidate of candidates) {
    const ratio = contrastRatio(candidate, background);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
  }
  return best;
}

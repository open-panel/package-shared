import { z } from "zod";

/**
 * A BCP-47 tag, region included: "pt-BR" and "pt-PT" differ enough in software
 * vocabulary that pretending they are one "pt" would be a promise the
 * translations do not keep.
 */
export const LocaleTagSchema = z
  .string()
  .regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/, "must be a BCP-47 tag such as pt-BR");

export type Locale = z.infer<typeof LocaleTagSchema>;

/**
 * The languages the app ships with, compiled into the desktop rather than read
 * from disk — the same reason BUILT_IN_THEME is compiled in: the window has to
 * be able to label itself before, or entirely without, the daemon.
 *
 * Shipping them as code also keeps them typechecked against the English
 * catalogue, so a key added to en-US.ts and forgotten in pt-BR.ts is a compile
 * error rather than a blank label a user finds first. A *contributed* locale
 * cannot have that check — it is data, loaded at runtime — so it falls back
 * per key to English instead.
 */
export const BUILT_IN_LOCALES = ["en-US", "pt-BR", "es-ES"] as const;

export type BuiltInLocale = (typeof BUILT_IN_LOCALES)[number];

/** What the app falls back to when nothing else can be resolved. */
export const DEFAULT_LOCALE: BuiltInLocale = "en-US";

/**
 * Each built-in language named in itself. A user looking for their own
 * language scans for the word they would write, not for its English name — so
 * a contributed locale carries its own endonym in its catalogue too.
 */
export const BUILT_IN_LOCALE_NAMES: Record<BuiltInLocale, string> = {
  "en-US": "English (US)",
  "pt-BR": "Português (Brasil)",
  "es-ES": "Español (España)",
};

/**
 * A locale contribution: one language, named in itself, with the messages it
 * translates. Keys it does not carry fall back to English, so a catalogue that
 * translates the forty labels an author cares about is useful immediately
 * rather than only once it is complete.
 *
 * Messages are plain strings — the same ICU-ish placeholder syntax the bundled
 * catalogues use. There is no field in which code can be expressed, which is
 * what lets a locale be read as data and never imported (see PluginRegistry).
 */
export const LocaleCatalogSchema = z.object({
  id: LocaleTagSchema,
  /** The language named in itself, e.g. "Português (Portugal)". */
  name: z.string().min(1).max(48),
  messages: z.record(z.string(), z.string()),
});

export type LocaleCatalog = z.infer<typeof LocaleCatalogSchema>;

/**
 * What Settings → Language lists. Version, author and homepage come from the
 * contributing plugin's manifest rather than the catalogue, which is why they
 * are optional: a built-in has no plugin behind it. Mirrors ThemeSummary.
 */
export const LocaleSummarySchema = z.object({
  id: LocaleTagSchema,
  name: z.string(),
  version: z.string().optional(),
  author: z.string().optional(),
  homepage: z.string().optional(),
  /** How many message keys it carries; 0 for a built-in, which ships compiled in. */
  messageCount: z.number().int().nonnegative(),
  builtIn: z.boolean(),
});

export type LocaleSummary = z.infer<typeof LocaleSummarySchema>;

/**
 * "system" means "follow the OS", resolved by whichever client can actually
 * see that setting — the same split as ThemeMode, and for the same reason: the
 * daemon stores the choice verbatim and never guesses what it resolves to.
 */
export const LocaleModeSchema = z.union([z.literal("system"), LocaleTagSchema]);
export type LocaleMode = z.infer<typeof LocaleModeSchema>;

export const LocalePreferenceSchema = z.object({ locale: LocaleModeSchema });
export type LocalePreference = z.infer<typeof LocalePreferenceSchema>;

/**
 * Picks the best available locale for a list of BCP-47 tags, most preferred
 * first — `navigator.languages` in the webview, `LANG`/`LC_ALL` in a shell.
 *
 * `available` is passed in rather than read from a module constant because the
 * set is no longer fixed: a locale plugin adds to it at runtime.
 *
 * Matching is two-pass: an exact tag wins outright, and only then does a bare
 * language match ("pt-PT" -> "pt-BR"), so installing a pt-PT plugin cannot be
 * swallowed by the Brazilian catalogue that shipped first.
 */
export function matchLocale(
  tags: readonly string[] | string | undefined,
  available: readonly string[] = BUILT_IN_LOCALES,
): Locale | undefined {
  const list = typeof tags === "string" ? [tags] : (tags ?? []);
  // Accepts what each platform actually hands over: "pt-BR" from a webview,
  // "pt_BR.UTF-8" from a POSIX LANG.
  const normalized = list
    .map((tag) => tag.trim().split(".")[0]!.replace("_", "-"))
    .filter(Boolean);

  for (const tag of normalized) {
    const exact = available.find((locale) => locale.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
  }
  for (const tag of normalized) {
    const language = tag.split("-")[0]!.toLowerCase();
    const loose = available.find((locale) => locale.split("-")[0]!.toLowerCase() === language);
    if (loose) return loose;
  }
  return undefined;
}

/** The same match, but never undefined — for the places that have to paint something. */
export function resolveLocale(
  tags: readonly string[] | string | undefined,
  available: readonly string[] = BUILT_IN_LOCALES,
): Locale {
  return matchLocale(tags, available) ?? DEFAULT_LOCALE;
}

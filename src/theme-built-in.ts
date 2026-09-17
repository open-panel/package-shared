import type { ThemeManifest } from "./theme.js";

/**
 * The theme the app ships with, in both appearances.
 *
 * It is compiled in rather than read from disk for one reason: the desktop has
 * to be able to paint itself before — or entirely without — the daemon. A
 * window that opens unstyled precisely when the daemon is down, which is the
 * one moment the app already has bad news to deliver, is not acceptable.
 *
 * Its own direction is the instrument panel the app is a view of: a warm
 * graphite chassis (deliberately not the blue-black that reads as a default
 * developer-tool theme), with a single amber signal that means "this is what
 * you are about to act on". Green, amber and red stay separate from it as
 * system state, so the accent is never the only colour carrying meaning.
 */
export const BUILT_IN_THEME: ThemeManifest = {
  id: "openpanel",
  name: "OpenPanel",
  variants: {
    dark: {
      appearance: "dark",
      palette: {
        background: "#191a1c",
        surface: "#44474c",
        foreground: "#ecebe7",
        dim: "#a6a39c",
        accent: "#f0a92b",
        success: "#62c471",
        warning: "#e0a33c",
        danger: "#e2645a",
      },
    },
    light: {
      appearance: "light",
      palette: {
        background: "#e7e5e1",
        surface: "#ffffff",
        foreground: "#1c1b19",
        dim: "#5d5952",
        // Amber has to darken considerably to stay legible as a fill colour on
        // paper; the hue survives, the brightness cannot.
        accent: "#9a6400",
        success: "#2d7d3f",
        warning: "#8a5d00",
        danger: "#b83228",
        shadow: "#14181f",
      },
    },
  },
};

/** Every theme that exists without the daemon. Keyed by id for lookup on the desktop. */
export const BUILT_IN_THEMES: ThemeManifest[] = [BUILT_IN_THEME];

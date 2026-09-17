import { HOTKEY_SWITCH_ACTION } from "./action.js";

/**
 * Per-action-type glyphs (lucide-style, 20x20 viewBox, stroke-only) mirroring
 * apps/desktop's ActionTypeIcon — kept here as plain markup, rather than
 * imported from the desktop's React components, so a framework-agnostic
 * consumer (packages/core, generating the image sent to a physical device)
 * can render the exact same glyph without depending on React. Keep this map
 * in sync with `ACTION_ICONS` in apps/desktop/src/components/icons.tsx when
 * either changes.
 */
export const ACTION_ICON_GLYPHS: Record<string, string> = {
  hotkey: `<rect x="2" y="5.5" width="16" height="9" rx="1.5" /><path d="M5 9h.01M8 9h.01M11 9h.01M14 9h.01M5.5 12h9" />`,
  "open-url": `<circle cx="10" cy="10" r="7.25" /><path d="M2.75 10h14.5M10 2.75c2 2 3 4.6 3 7.25s-1 5.25-3 7.25c-2-2-3-4.6-3-7.25S8 4.75 10 2.75Z" />`,
  "open-app": `<rect x="2.5" y="3.5" width="15" height="13" rx="2" /><path d="M2.5 7.5h15M5.5 5.5h.01M7.75 5.5h.01" />`,
  shell: `<rect x="2.5" y="3.5" width="15" height="13" rx="2" /><path d="M6 8.5 8 10.5l-2 2M10.5 12.5h3.5" />`,
  "type-text": `<path d="M4 5.5h12M10 5.5V15M7.5 15h5" />`,
  "hotkey.switch": `<rect x="2.25" y="5.75" width="15.5" height="8.5" rx="4.25" /><circle cx="6.5" cy="10" r="2" />`,
  "system.open": `<path d="M11 2.75H5.5a1.5 1.5 0 0 0-1.5 1.5v11.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V7.75L11 2.75Z" /><path d="M10.75 3v5h5.25" />`,
  "system.close": `<rect x="2.5" y="3.5" width="15" height="13" rx="2" /><path d="M2.5 7.5h15M8 10.5l4 4M12 10.5l-4 4" />`,
  "system.multimedia": `<path d="M4 5.5v9M8 5.5l5.5 4.5L8 14.5M16 5.5v9" />`,
  "change-page": `<path d="m10 2.75 7 3.75-7 3.75-7-3.75 7-3.75Z" /><path d="m3 10.5 7 3.75 7-3.75" />`,
  "page.next": `<path d="m8 5.5 5 4.5-5 4.5" />`,
  "page.previous": `<path d="m12 5.5-5 4.5 5 4.5" />`,
  "page.first": `<path d="m14 5.5L9.5 10l4.5 4.5M6 5v10" />`,
  "page.last": `<path d="m6 5.5 4.5 4.5L6 14.5M14 5v10" />`,
  "profile.switch": `<path d="M3.5 7h11l-3-3M16.5 13h-11l3 3" />`,
  "ui.create-folder": `<path d="M2.75 6.25a1.5 1.5 0 0 1 1.5-1.5h3l1.75 2h6.25a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H4.25a1.5 1.5 0 0 1-1.5-1.5v-8Z" /><path d="M10 9.75v3.5M8.25 11.5h3.5" />`,
  "folder.open": `<path d="M2.75 6.25a1.5 1.5 0 0 1 1.5-1.5h3l1.75 2h6.25a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H4.25a1.5 1.5 0 0 1-1.5-1.5v-8Z" />`,
  "folder.back": `<path d="M16 15v-3.5a3 3 0 0 0-3-3H4.5" /><path d="m8 5-3.5 3.5L8 12" />`,
};

/** Same fallback as ActionTypeIcon's `PlugIcon`, for an action type with no entry above. */
export const DEFAULT_ACTION_ICON_GLYPH = `<path d="M7.5 2.75v4M12.5 2.75v4M5.5 6.75h9v2.5a4.5 4.5 0 0 1-9 0v-2.5ZM10 13.75v3.5" />`;

/**
 * "Multimedia" is one action that does seven different things, so a single
 * glyph would leave a row of media keys looking identical on the device. The
 * icon follows the key that was picked; the entry in ACTION_ICON_GLYPHS above
 * stays as the generic stand-in for the action list, where no key is chosen
 * yet. Keyed by the `key` config value — `MEDIA_KEYS` in
 * @open-panel/action-engine's platform/media.ts.
 */
export const MEDIA_KEY_GLYPHS: Record<string, string> = {
  "play-pause": `<path d="m3.5 5 5.5 5-5.5 5V5Z" /><path d="M13 5.5v9M16.5 5.5v9" />`,
  next: `<path d="m4.5 5 7 5-7 5V5Z" /><path d="M15 5.5v9" />`,
  previous: `<path d="m15.5 5-7 5 7 5V5Z" /><path d="M5 5.5v9" />`,
  stop: `<rect x="5" y="5" width="10" height="10" rx="1.5" />`,
  mute: `<path d="M10 4.5 6 8H3.5v4H6l4 3.5v-11Z" /><path d="m13.5 8.5 3 3M16.5 8.5l-3 3" />`,
  "volume-up": `<path d="M10 4.5 6 8H3.5v4H6l4 3.5v-11Z" /><path d="M13 7.75a3 3 0 0 1 0 4.5M15.25 5.75a6 6 0 0 1 0 8.5" />`,
  "volume-down": `<path d="M10 4.5 6 8H3.5v4H6l4 3.5v-11Z" /><path d="M13 7.75a3 3 0 0 1 0 4.5" />`,
};

/**
 * "Hotkey Switch" alternates between two shortcuts, so its key has to say which
 * way it is flipped — a mute toggle that looks the same muted and unmuted is
 * useless. The knob moves, and the "on" side is filled so it reads at key size.
 */
export const HOTKEY_SWITCH_GLYPHS: Record<"on" | "off", string> = {
  off: `<rect x="2.25" y="5.75" width="15.5" height="8.5" rx="4.25" /><circle cx="6.5" cy="10" r="2" />`,
  on: `<rect x="2.25" y="5.75" width="15.5" height="8.5" rx="4.25" /><circle cx="13.5" cy="10" r="2" fill="currentColor" />`,
};

/** Runtime state a key can draw that is not stored in the action's config. */
export interface ActionIconState {
  /** Which way a "Hotkey Switch" key is currently flipped. */
  switchedOn?: boolean;
}

/**
 * The glyph for a stored action, config and live state included — the single
 * place that decides which artwork a key falls back to, shared by the desktop
 * grid and the image the daemon pushes to a physical device. A custom icon on
 * the button still wins over this; both call sites check that first.
 */
export function actionIconGlyph(
  actionType: string,
  config?: Record<string, unknown>,
  state?: ActionIconState,
): string | undefined {
  if (actionType === "system.multimedia") {
    const key = config?.key;
    if (typeof key === "string" && MEDIA_KEY_GLYPHS[key]) return MEDIA_KEY_GLYPHS[key];
  }
  if (actionType === HOTKEY_SWITCH_ACTION) {
    return HOTKEY_SWITCH_GLYPHS[state?.switchedOn ? "on" : "off"];
  }
  return ACTION_ICON_GLYPHS[actionType];
}

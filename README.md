# @open-panel/shared

Domain types and [zod](https://zod.dev) schemas shared by every OpenPanel
process (daemon, desktop, CLI, and plugins). No Node-only or DOM-only APIs —
this package is safe to import from any of them.

Part of [OpenPanel](https://github.com/open-panel/openPanel), an
open-source, hardware-agnostic control platform for macro pads and
Stream Deck-style devices.

## Install

```bash
npm install @open-panel/shared
```

## What's in here

- **Profiles** — `Profile`, `Page`, `Button`, `ProfileDocument` and their zod
  schemas, plus `PROFILE_SCHEMA_VERSION`.
- **Actions** — `Action`, `ActionExecution`, `ActionExecutionStatus`,
  `ActionError`, action icon glyphs (`actionIconGlyph`, `ACTION_ICON_GLYPHS`).
- **Devices** — `DeviceInfo`, `DeviceState`, `DeviceCapabilities`,
  `DeviceEvent` (discriminated union), `ButtonImageFormat`,
  `DeviceImageCalibration`.
- **Themes** — `ThemeManifest`, `ThemePalette`, `ResolvedTheme`,
  `BUILT_IN_THEME`, theme derivation (`deriveVariant`, `resolveTheme`) and
  color math (`mix`, `withAlpha`, `contrastRatio`, `ensureContrast`,
  `parseHex`/`formatHex`, OKLab conversions).
- **Locales** — `Locale`, `BUILT_IN_LOCALES`, `LocaleCatalog`,
  `LocalePreference`, `matchLocale`/`resolveLocale`.
- **Logs & events** — `LogEntry`, `LogLevel`, `ButtonEvent`,
  `OpenPanelEventPayloads`/`OpenPanelEvents` (the event map the IPC layer is
  typed against).

Every exported value is either a plain TypeScript type/interface or a zod
schema (`XxxSchema`) with its inferred type (`type Xxx = z.infer<typeof
XxxSchema>`) — validate untrusted input (IPC params, imported profile JSON,
plugin config) with the schema, and use the inferred type everywhere else.

## Usage

```ts
import { ProfileSchema, type Profile } from "@open-panel/shared";

function loadProfile(raw: unknown): Profile {
  return ProfileSchema.parse(raw);
}
```

```ts
import { resolveTheme, BUILT_IN_THEME } from "@open-panel/shared";

const theme = resolveTheme(BUILT_IN_THEME, "dark");
```

## Related packages

- [`@open-panel/device-sdk`](https://www.npmjs.com/package/@open-panel/device-sdk) — device abstraction built on these types
- [`@open-panel/action-engine`](https://www.npmjs.com/package/@open-panel/action-engine) — action execution built on these types
- [`@open-panel/plugin-sdk`](https://www.npmjs.com/package/@open-panel/plugin-sdk) — write a plugin against these types

## License

MIT © [OpenPanel contributors](https://github.com/open-panel/openPanel/blob/main/LICENSE)

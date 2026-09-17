import { z } from "zod";
import { DeviceInfoSchema } from "./device.js";
import { ProfileSchema } from "./profile.js";
import { ActionExecutionSchema, ActionErrorSchema } from "./action.js";
import { LogEntrySchema } from "./log.js";

/** IPC-facing button press event, distinct from the internal DeviceEvent union (specs.md #8). */
export const ButtonEventSchema = z.object({
  deviceId: z.string(),
  profileId: z.string().optional(),
  pageId: z.string().optional(),
  buttonId: z.string().optional(),
  position: z.number().int().nonnegative(),
  timestamp: z.number(),
});
export type ButtonEvent = z.infer<typeof ButtonEventSchema>;

/** The full set of events the daemon may push to IPC clients (desktop, CLI). */
export const OpenPanelEventPayloads = {
  deviceConnected: DeviceInfoSchema,
  deviceDisconnected: DeviceInfoSchema,
  deviceStateChanged: DeviceInfoSchema,
  buttonPressed: ButtonEventSchema,
  actionStarted: ActionExecutionSchema,
  actionFinished: ActionExecutionSchema,
  actionFailed: ActionErrorSchema,
  log: LogEntrySchema,
  /**
   * The active profile changed. Emitted when something other than the desktop
   * app causes it — a `profile.switch` action fired from the device — so the
   * UI does not keep editing a profile the hardware has already left.
   */
  profileActivated: ProfileSchema,
  /**
   * A theme file was added, changed or removed on disk. Carries nothing: the
   * client refetches, which keeps one code path for "themes changed" whether
   * the cause was an edit, a delete, or the daemon reloading its directories.
   */
  themesChanged: z.object({}),
  localesChanged: z.object({}),
  /**
   * A plugin was installed, removed, or changed on disk. Carries nothing for
   * the same reason as themesChanged: the client refetches the plugin list and
   * the action catalogue, so installing an action pack fills the rail without
   * a second event kind for "the catalogue changed".
   */
  pluginsChanged: z.object({}),
} as const;

export type OpenPanelEvents = {
  deviceConnected: z.infer<typeof DeviceInfoSchema>;
  deviceDisconnected: z.infer<typeof DeviceInfoSchema>;
  deviceStateChanged: z.infer<typeof DeviceInfoSchema>;
  buttonPressed: ButtonEvent;
  actionStarted: z.infer<typeof ActionExecutionSchema>;
  actionFinished: z.infer<typeof ActionExecutionSchema>;
  actionFailed: z.infer<typeof ActionErrorSchema>;
  log: z.infer<typeof LogEntrySchema>;
  profileActivated: z.infer<typeof ProfileSchema>;
  themesChanged: Record<string, never>;
  localesChanged: Record<string, never>;
  pluginsChanged: Record<string, never>;
};

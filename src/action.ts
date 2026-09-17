import { z } from "zod";

/** Actions are typed objects with an opaque, plugin-defined configuration payload. See specs.md #14. */
export const ActionSchema = z.object({
  type: z.string().min(1),
  config: z.record(z.string(), z.unknown()).default({}),
});
export type Action = z.infer<typeof ActionSchema>;

/**
 * The page-indicator action, named here rather than in @open-panel/action-engine
 * because two packages need it: the action itself (a no-op on press) and the
 * profile runtime, which paints the live "2/3" onto that key while rendering.
 * Naming it in shared keeps core from having to import action-engine values.
 */
export const PAGE_INDICATOR_ACTION = "page.indicator";

/**
 * The "Hotkey Switch" action, named here for the same reason as the page
 * indicator: two packages need it. The action alternates between two shortcuts,
 * but which way it is currently flipped is per-button runtime state owned by
 * the profile runtime — which also paints that state onto the key.
 */
export const HOTKEY_SWITCH_ACTION = "hotkey.switch";

/**
 * The action that makes a button a folder. Named here because reachability of a
 * page depends on it: a page behind a button whose action is no longer this one
 * can never be opened again (see profile-engine `pruneOrphanPages`).
 */
export const FOLDER_OPEN_ACTION = "folder.open";

/**
 * The action that leaves a folder. Named here because the profile engine has to
 * guarantee every page inside a folder carries one — without it, that page is a
 * dead end on the device.
 */
export const FOLDER_BACK_ACTION = "folder.back";

/** A reference stored on a button — identical shape to Action, named separately for clarity in the button model. */
export const ActionReferenceSchema = ActionSchema;
export type ActionReference = z.infer<typeof ActionReferenceSchema>;

export const ActionExecutionStatusSchema = z.enum(["running", "succeeded", "failed"]);
export type ActionExecutionStatus = z.infer<typeof ActionExecutionStatusSchema>;

/** Every execution MUST have an execution ID for debugging (specs.md #15). */
export const ActionExecutionSchema = z.object({
  executionId: z.string(),
  actionType: z.string(),
  deviceId: z.string().optional(),
  buttonId: z.string().optional(),
  startedAt: z.number(),
  finishedAt: z.number().optional(),
  status: ActionExecutionStatusSchema,
});
export type ActionExecution = z.infer<typeof ActionExecutionSchema>;

export const ActionErrorSchema = z.object({
  executionId: z.string(),
  actionType: z.string(),
  message: z.string(),
});
export type ActionError = z.infer<typeof ActionErrorSchema>;

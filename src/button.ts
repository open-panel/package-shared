import { z } from "zod";
import { ActionReferenceSchema } from "./action.js";

/**
 * Button position is a device-layout coordinate, not a fixed profile constant.
 * Do not hard-code a fixed number of buttons into the profile model (specs.md #13).
 */
export const ButtonAppearanceSchema = z.object({
  icon: z.string().optional(), // path or data-uri, resolved by the desktop app
  label: z.string().optional(),
  /** Optional visual state key (e.g. "on" | "off" | "active") a plugin/action can toggle. */
  state: z.string().optional(),
});
export type ButtonAppearance = z.infer<typeof ButtonAppearanceSchema>;

export const ButtonSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().nonnegative(),
  appearance: ButtonAppearanceSchema.default({}),
  action: ActionReferenceSchema.optional(),
});
export type Button = z.infer<typeof ButtonSchema>;

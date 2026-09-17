import { z } from "zod";
import { ButtonSchema } from "./button.js";

export const PROFILE_SCHEMA_VERSION = 3;

export const PageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  buttons: z.array(ButtonSchema).default([]),
  /**
   * The button this page lives behind, making pages a tree instead of a flat
   * list: a folder IS a button, and its pages are the pages that name it as
   * their parent. Absent means the page belongs to the profile's root layer.
   *
   * Pages are only ever shown, numbered and navigated within one layer, so
   * folders nest arbitrarily (a folder page can hold another folder button)
   * without anything needing to know how deep it is.
   */
  parentButtonId: z.string().min(1).optional(),
});
export type Page = z.infer<typeof PageSchema>;

export const ProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Every page of every layer, flat. Use the parentButtonId helpers in @open-panel/profile-engine to walk them. */
  pages: z.array(PageSchema).default([]),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** Envelope persisted to disk/DB and used for import/export (specs.md #19, #27). */
export const ProfileDocumentSchema = z.object({
  schemaVersion: z.number().int().positive(),
  profile: ProfileSchema,
});
export type ProfileDocument = z.infer<typeof ProfileDocumentSchema>;

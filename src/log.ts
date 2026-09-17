import { z } from "zod";

export const LogLevelSchema = z.enum(["trace", "debug", "info", "warn", "error"]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const LogEntrySchema = z.object({
  level: LogLevelSchema,
  event: z.string(),
  message: z.string().optional(),
  timestamp: z.number(),
  // Arbitrary structured metadata. Secrets/tokens MUST be redacted before this is constructed
  // (specs.md #18, #20) — see @open-panel/core logger redaction.
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type LogEntry = z.infer<typeof LogEntrySchema>;

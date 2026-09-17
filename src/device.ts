import { z } from "zod";

/**
 * Capabilities MUST be explicit — the core and UI branch on these flags
 * instead of on a device id/vendor string. See specs.md #9.
 */
/**
 * The exact bytes a device wants for one button, declared by the adapter and
 * produced by the host (see DeviceConnectionManager#setButtonImage).
 *
 * Resizing an arbitrary icon into a square of the right size, rotating it,
 * insetting it by the calibrated margin and encoding it is not device
 * knowledge — it is the same work for every screen-bearing deck, and doing it
 * in the adapter is what forced every device plugin to depend on an image
 * library. What is actually device knowledge is this declaration: how big,
 * which way up, in what encoding.
 */
export const ButtonImageFormatSchema = z.object({
  /** Edge of the square the device expects, in pixels. */
  size: z.number().int().positive(),
  encoding: z.enum(["jpeg", "png", "raw"]),
  /** JPEG only; ignored otherwise. */
  quality: z.number().int().min(1).max(100).optional(),
  /** Clockwise, applied after the content is fitted to `size`. */
  rotationDegrees: z.number().int().optional(),
});
export type ButtonImageFormat = z.infer<typeof ButtonImageFormatSchema>;

export const DeviceCapabilitiesSchema = z.object({
  buttons: z.number().int().nonnegative(),
  hasDisplay: z.boolean(),
  supportsButtonImages: z.boolean(),
  supportsButtonLabels: z.boolean(),
  hasEncoders: z.boolean(),
  hasTouchscreen: z.boolean(),
  /**
   * Whether this device supports live per-button icon offset/margin
   * calibration (see @open-panel/device-sdk DeckDevice#setImageOffset). True
   * only for hardware whose per-button screens aren't guaranteed to be
   * mounted with uniform alignment — most devices don't need this.
   */
  supportsImageCalibration: z.boolean(),
  /**
   * Present when the device takes button artwork as pixels. The host encodes
   * to exactly this and hands the adapter finished bytes, so an adapter never
   * imports an image library. Absent for a device with no screens.
   */
  buttonImage: ButtonImageFormatSchema.optional(),
});
export type DeviceCapabilities = z.infer<typeof DeviceCapabilitiesSchema>;

/** Pixel nudge applied to one button's icon content within its margin. */
export const ImageOffsetSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
});
export type ImageOffset = z.infer<typeof ImageOffsetSchema>;

/**
 * A device's current image calibration: a shared margin (px) plus a
 * per-position content offset within it, keyed by position as a string
 * (JSON object keys are always strings). A position missing from `offsets`
 * has no calibrated offset yet — (0, 0).
 */
export const DeviceImageCalibrationSchema = z.object({
  marginPx: z.number().int().nonnegative(),
  offsets: z.record(z.string(), ImageOffsetSchema),
});
export type DeviceImageCalibration = z.infer<typeof DeviceImageCalibrationSchema>;

/**
 * Lifecycle state machine required by specs.md #11.
 * DISCOVERED -> CONNECTING -> CONNECTED -> DISCONNECTED -> RECONNECTING -> CONNECTED
 */
export const DeviceStateSchema = z.enum([
  "discovered",
  "connecting",
  "connected",
  "disconnected",
  "reconnecting",
  "error",
]);
export type DeviceState = z.infer<typeof DeviceStateSchema>;

export const DeviceInfoSchema = z.object({
  id: z.string().min(1),
  driverId: z.string().min(1), // e.g. "fifine-d6" — identifies which adapter owns this device
  vendor: z.string(),
  product: z.string(),
  serialNumber: z.string().optional(),
  capabilities: DeviceCapabilitiesSchema,
  state: DeviceStateSchema,
});
export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

/** Normalized device events emitted by adapters. Raw HID payloads never cross this boundary. */
export const DeviceEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("button.press"),
    deviceId: z.string(),
    position: z.number().int().nonnegative(),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("button.release"),
    deviceId: z.string(),
    position: z.number().int().nonnegative(),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("encoder.rotate"),
    deviceId: z.string(),
    position: z.number().int().nonnegative(),
    delta: z.number().int(),
    timestamp: z.number(),
  }),
]);
export type DeviceEvent = z.infer<typeof DeviceEventSchema>;
export type DeviceEventListener = (event: DeviceEvent) => void;

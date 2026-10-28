export const RENDERED_VIEWPORT = {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
} as const;

export const RENDERED_LIMITS = {
  viewport: RENDERED_VIEWPORT,
  /** Whole rendered scan, including browser launch. */
  totalTimeoutMs: 38_000,
  /** Navigation deadline. */
  navigationTimeoutMs: 20_000,
  /** Bounded settle time after DOMContentLoaded. */
  networkIdleMs: 5_000,
  /** Extra pause after idle so late widgets can paint. */
  settleMs: 700,
  maxRequests: 160,
  maxTextBlocks: 700,
  maxButtons: 100,
  /** Proxy-wide byte budget for all requests in one scan. */
  maxBytes: 12 * 1024 * 1024,
  maxConnections: 24,
  screenshotQuality: 45,
  /** Keep the base64 screenshot below roughly 120 KB before encoding overhead. */
  screenshotMaxBytes: 90 * 1024,
  /** Strict limit because a rendered scan is expensive. */
  scansPerWindow: 2,
  windowMs: 10 * 60 * 1000,
} as const;

export const MOBILE_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 ShopifyCROFixer/0.3 (rendered CRO audit)";

export function renderedAuditEnabled() {
  const value = (process.env.RENDERED_AUDIT_ENABLED ?? "true").trim().toLowerCase();
  return value !== "false" && value !== "0" && value !== "off";
}

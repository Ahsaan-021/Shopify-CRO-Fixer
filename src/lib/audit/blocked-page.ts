const MAX_INSPECTED_CHARS = 300_000;

export type BlockedPageReason = "bot-protection" | "password-page";

export type BlockedPageDetection = {
  reason: BlockedPageReason;
  message: string;
};

/**
 * Detects common challenge and password pages that return HTTP 200 but do not
 * contain the store's real content. Parsing these as a normal page would
 * produce misleading findings, so the scan stops with an explicit error.
 *
 * The checks are deliberately marker-based and conservative. A normal page
 * that merely mentions "captcha" in a script is not treated as blocked.
 */
export function detectBlockedPage(html: string): BlockedPageDetection | null {
  const sample = html.slice(0, MAX_INSPECTED_CHARS).toLowerCase();

  // Strong markers only appear on challenge infrastructure, so one is enough.
  const strongMarkers = [
    "cdn-cgi/challenge-platform",
    "cf-chl",
    "challenge-error-text",
    "captcha-delivery.com",
    "px-captcha",
    "request unsuccessful. incapsula",
    "vercel security checkpoint",
  ];

  // These phrases can also appear in ordinary copy, so two must be present.
  const weakMarkers = [
    "just a moment...",
    "attention required! | cloudflare",
    "enable javascript and cookies to continue",
  ];
  const weakMatches = weakMarkers.filter((marker) =>
    sample.includes(marker),
  ).length;

  if (
    strongMarkers.some((marker) => sample.includes(marker)) ||
    weakMatches >= 2
  ) {
    return {
      reason: "bot-protection",
      message:
        "The store's bot protection blocked the scan. Try again later or from a different network.",
    };
  }

  const hasPasswordForm =
    sample.includes('action="/password"') &&
    sample.includes('type="password"') &&
    sample.includes('name="password"');

  if (
    hasPasswordForm &&
    (sample.includes("enter store using password") ||
      sample.includes("store password"))
  ) {
    return {
      reason: "password-page",
      message:
        "This storefront is password-protected. The scanner only audits public pages.",
    };
  }

  return null;
}

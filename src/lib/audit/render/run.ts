import { applyFixPlan } from "@/lib/audit/fix-plan";
import {
  RENDERED_LIMITS,
  RENDERED_VIEWPORT,
  MOBILE_USER_AGENT,
  renderedAuditEnabled,
} from "@/lib/audit/render/config";
import { buildRenderedChecks } from "@/lib/audit/render/checks";
import { RenderFailure } from "@/lib/audit/render/errors";
import { renderPageSnapshot, type BrowserSnapshot } from "@/lib/audit/render/browser";
import { detectSignals } from "@/lib/audit/render/signals";
import type {
  RenderedAudit,
  RenderedMetrics,
  RenderedResult,
} from "@/lib/audit/types";
import type { RenderedSnapshot } from "@/lib/audit/render/extract";
import { validateAuditUrl } from "@/lib/audit/validation";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new RenderFailure(
          "TIMEOUT",
          "The rendered scan took too long to finish, so the static findings are still shown.",
        ),
      );
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function metricsFrom(snapshot: RenderedSnapshot): RenderedMetrics {
  const inFirstScreen = (rect: { y: number; height: number } | null) =>
    Boolean(rect && rect.y + rect.height <= snapshot.viewportHeight);

  return {
    scrollWidth: snapshot.scrollWidth,
    viewportWidth: snapshot.viewportWidth,
    pageHeight: snapshot.pageHeight,
    titleText: snapshot.titleText,
    priceText: snapshot.priceText,
    compareAtText: snapshot.compareAtText,
    titleRect: snapshot.titleRect,
    priceRect: snapshot.priceRect,
    addToCartRect: snapshot.addToCartRect,
    addToCartLabel: snapshot.addToCartLabel,
    titleAboveFold: inFirstScreen(snapshot.titleRect),
    priceAboveFold: inFirstScreen(snapshot.priceRect),
    addToCartAboveFold: snapshot.addToCartAboveFold,
    stickyAddToCartDetected: snapshot.stickyAddToCartDetected,
    stickyAddToCartLabel: snapshot.stickyAddToCartLabel,
    productImageCount: snapshot.productImageCount,
    productImagesWithAlt: snapshot.productImagesWithAlt,
    videoDetected: snapshot.videoDetected,
    variantSelectorDetected: snapshot.variantSelectorDetected,
    variantPreselected: snapshot.variantPreselected,
    discountBadgeDetected: snapshot.discountBadgeDetected,
    discountBadgeText: snapshot.discountBadgeText,
    overlayCoverage: snapshot.overlayCoverage,
    overlayText: snapshot.overlayText,
    horizontalOverflow: snapshot.horizontalOverflow,
  };
}

export type RunRenderedOptions = {
  enabled?: boolean;
  render?: (url: string) => Promise<BrowserSnapshot>;
};

/**
 * Runs the optional rendered audit. Any failure returns a structured
 * "unavailable" result; it never throws to the route and never removes the
 * static or product-JSON findings.
 */
export async function runRenderedAudit(
  rawUrl: string,
  options: RunRenderedOptions = {},
): Promise<RenderedResult> {
  const validation = validateAuditUrl(rawUrl);
  if (!validation.ok) {
    return {
      status: "unavailable",
      code: "BLOCKED",
      message: validation.message,
    };
  }

  const enabled = options.enabled ?? renderedAuditEnabled();
  if (!enabled) {
    return {
      status: "unavailable",
      code: "DISABLED",
      message:
        "Rendered scanning is disabled on this deployment. Static HTML and product JSON findings are still shown.",
    };
  }

  const startedAt = Date.now();

  try {
    const render = options.render ?? renderPageSnapshot;
    const result = await withTimeout(
      render(validation.url),
      RENDERED_LIMITS.totalTimeoutMs,
    );

    const signals = detectSignals(result.snapshot);
    const checks = buildRenderedChecks(result.snapshot, signals).map(
      applyFixPlan,
    );

    const data: RenderedAudit = {
      scannedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      requestedUrl: validation.url,
      finalUrl: result.finalUrl,
      viewport: {
        width: RENDERED_VIEWPORT.width,
        height: RENDERED_VIEWPORT.height,
        deviceScaleFactor: 1,
      },
      userAgent: MOBILE_USER_AGENT,
      screenshot: result.screenshot,
      metrics: metricsFrom(result.snapshot),
      signals,
      checks,
      limitations: [
        "Rendered in headless Chromium at 390 × 844 with a mobile user agent. A real phone can render differently.",
        "Automated signal detection is heuristic. Confirm important findings in a browser.",
        "The scanner did not click, add to cart, or complete checkout.",
        "Cross-origin iframes and some app widgets may not expose their content to the scanner.",
        "Only the page state at scan time was captured. Experiments, geolocation, or login state can change what a shopper sees.",
        `Only the first ${RENDERED_VIEWPORT.height}px screen was captured for the screenshot.`,
      ],
    };

    return { status: "ok", data };
  } catch (error) {
    if (error instanceof RenderFailure) {
      return {
        status: "unavailable",
        code: error.code,
        message: error.message,
      };
    }

    return {
      status: "unavailable",
      code: "ERROR",
      message:
        "The rendered scan could not complete, so the static findings are still shown.",
    };
  }
}

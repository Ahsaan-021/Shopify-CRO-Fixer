import type { RenderedLocation, RenderedRect } from "@/lib/audit/types";
import type { RenderedSnapshot, SnapshotMarker } from "@/lib/audit/render/extract";

const LOCATIONS: RenderedLocation[] = [
  "above-fold",
  "near-buy-box",
  "below-fold",
  "footer-only",
  "page-wide",
  "not-found",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function number(value: unknown, max = 1_000_000): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max
    ? Math.round(value)
    : null;
}

function text(value: unknown, max = 60_000): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function optionalText(value: unknown, max = 200): string | null {
  const clean = text(value, max);
  return clean || null;
}

function rect(value: unknown): RenderedRect | null {
  if (!isRecord(value)) return null;
  const x = number(value.x, 100_000);
  const y = number(value.y, 1_000_000);
  const width = number(value.width, 100_000);
  const height = number(value.height, 1_000_000);
  if (x === null || y === null || width === null || height === null) {
    return null;
  }
  return { x, y, width, height };
}

function location(value: unknown): RenderedLocation {
  return typeof value === "string" && (LOCATIONS as string[]).includes(value)
    ? (value as RenderedLocation)
    : "not-found";
}

function markers(value: unknown): SnapshotMarker[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 80)
    .filter(isRecord)
    .map((entry) => ({
      id: text(entry.id, 60),
      evidence: text(entry.evidence, 160),
      location: location(entry.location),
    }))
    .filter((entry) => entry.id.length > 0);
}

/**
 * The browser returns untrusted JSON. Only known fields with bounded sizes are
 * copied into the report; anything malformed makes the rendered result
 * unavailable rather than being displayed or trusted.
 */
export function sanitiseSnapshot(value: unknown): RenderedSnapshot | null {
  if (!isRecord(value)) return null;

  const scrollWidth = number(value.scrollWidth, 200_000);
  const viewportWidth = number(value.viewportWidth, 10_000);
  const viewportHeight = number(value.viewportHeight, 20_000);
  const pageHeight = number(value.pageHeight, 200_000);
  const productImageCount = number(value.productImageCount, 500);
  const productImagesWithAlt = number(value.productImagesWithAlt, 500);
  const descriptionTextLength = number(value.descriptionTextLength, 500_000);
  const descriptionBulletCount = number(value.descriptionBulletCount, 2_000);
  const overlayCoverage =
    typeof value.overlayCoverage === "number" &&
    Number.isFinite(value.overlayCoverage) &&
    value.overlayCoverage >= 0 &&
    value.overlayCoverage <= 1
      ? value.overlayCoverage
      : null;

  if (
    scrollWidth === null ||
    viewportWidth === null ||
    viewportHeight === null ||
    pageHeight === null ||
    productImageCount === null ||
    productImagesWithAlt === null ||
    descriptionTextLength === null ||
    descriptionBulletCount === null ||
    overlayCoverage === null ||
    typeof value.horizontalOverflow !== "boolean" ||
    typeof value.videoDetected !== "boolean" ||
    typeof value.variantSelectorDetected !== "boolean" ||
    typeof value.stickyAddToCartDetected !== "boolean" ||
    typeof value.discountBadgeDetected !== "boolean" ||
    typeof value.addToCartAboveFold !== "boolean" ||
    !isRecord(value.texts)
  ) {
    return null;
  }

  return {
    finalUrl: text(value.finalUrl, 2_000),
    documentTitle: text(value.documentTitle, 200),
    scrollWidth,
    viewportWidth,
    viewportHeight,
    pageHeight,
    titleText: optionalText(value.titleText, 160),
    priceText: optionalText(value.priceText, 60),
    compareAtText: optionalText(value.compareAtText, 60),
    titleRect: rect(value.titleRect),
    priceRect: rect(value.priceRect),
    addToCartRect: rect(value.addToCartRect),
    addToCartLabel: optionalText(value.addToCartLabel, 80),
    addToCartAboveFold: value.addToCartAboveFold,
    stickyAddToCartDetected: value.stickyAddToCartDetected,
    stickyAddToCartLabel: optionalText(value.stickyAddToCartLabel, 80),
    productImageCount,
    productImagesWithAlt: Math.min(productImagesWithAlt, productImageCount),
    videoDetected: value.videoDetected,
    variantSelectorDetected: value.variantSelectorDetected,
    variantPreselected:
      typeof value.variantPreselected === "boolean"
        ? value.variantPreselected
        : null,
    discountBadgeDetected: value.discountBadgeDetected,
    discountBadgeText: optionalText(value.discountBadgeText, 80),
    overlayCoverage,
    overlayText: optionalText(value.overlayText, 160),
    horizontalOverflow: value.horizontalOverflow,
    descriptionTextLength,
    descriptionBulletCount,
    buttons: Array.isArray(value.buttons)
      ? value.buttons.slice(0, 100).map((entry) => text(entry, 80)).filter(Boolean)
      : [],
    texts: {
      aboveFold: text(value.texts.aboveFold),
      nearBuyBox: text(value.texts.nearBuyBox),
      belowFold: text(value.texts.belowFold),
      footer: text(value.texts.footer),
      pageWide: text(value.texts.pageWide),
    },
    markers: markers(value.markers),
  };
}

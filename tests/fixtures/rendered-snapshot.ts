import type { RenderedSnapshot } from "@/lib/audit/render/extract";

/**
 * A realistic rendered-snapshot fixture. Tests override only the fields they
 * need, so every test starts from a complete, valid measurement object.
 */
export function snapshot(
  overrides: Partial<RenderedSnapshot> = {},
): RenderedSnapshot {
  return {
    finalUrl: "https://store.example/products/trail-runner",
    documentTitle: "Trail Runner",
    scrollWidth: 390,
    viewportWidth: 390,
    viewportHeight: 844,
    pageHeight: 3200,
    titleText: "Trail Runner",
    priceText: "$128.00",
    compareAtText: null,
    titleRect: { x: 16, y: 120, width: 358, height: 40 },
    priceRect: { x: 16, y: 168, width: 120, height: 28 },
    addToCartRect: { x: 16, y: 220, width: 358, height: 52 },
    addToCartLabel: "Add to cart",
    addToCartAboveFold: true,
    stickyAddToCartDetected: false,
    stickyAddToCartLabel: null,
    productImageCount: 5,
    productImagesWithAlt: 5,
    videoDetected: false,
    variantSelectorDetected: true,
    variantPreselected: true,
    discountBadgeDetected: false,
    discountBadgeText: null,
    overlayCoverage: 0,
    overlayText: null,
    horizontalOverflow: false,
    descriptionTextLength: 720,
    descriptionBulletCount: 5,
    buttons: ["Add to cart", "Shop Pay"],
    texts: {
      aboveFold: "",
      nearBuyBox: "",
      belowFold: "",
      footer: "",
      pageWide: "",
    },
    markers: [],
    ...overrides,
  };
}

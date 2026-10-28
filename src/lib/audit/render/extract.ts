import type { RenderedLocation, RenderedRect } from "@/lib/audit/types";

export type SnapshotMarkerInput = { id: string; selectors: string[] };

export type SnapshotMarker = {
  id: string;
  evidence: string;
  location: RenderedLocation;
};

export type RenderedSnapshot = {
  finalUrl: string;
  documentTitle: string;
  scrollWidth: number;
  viewportWidth: number;
  viewportHeight: number;
  pageHeight: number;
  titleText: string | null;
  priceText: string | null;
  compareAtText: string | null;
  titleRect: RenderedRect | null;
  priceRect: RenderedRect | null;
  addToCartRect: RenderedRect | null;
  addToCartLabel: string | null;
  addToCartAboveFold: boolean;
  stickyAddToCartDetected: boolean;
  stickyAddToCartLabel: string | null;
  productImageCount: number;
  productImagesWithAlt: number;
  videoDetected: boolean;
  variantSelectorDetected: boolean;
  variantPreselected: boolean | null;
  discountBadgeDetected: boolean;
  discountBadgeText: string | null;
  overlayCoverage: number;
  overlayText: string | null;
  horizontalOverflow: boolean;
  descriptionTextLength: number;
  descriptionBulletCount: number;
  buttons: string[];
  texts: {
    aboveFold: string;
    nearBuyBox: string;
    belowFold: string;
    footer: string;
    pageWide: string;
  };
  markers: SnapshotMarker[];
};

export type ExtractInput = {
  maxTextBlocks: number;
  maxButtons: number;
  markers: SnapshotMarkerInput[];
};

/**
 * Runs inside Chromium. It only reads layout and text; it never changes the
 * page, submits a form, or returns HTML. The result is treated as untrusted
 * data by the server.
 */
export async function extractSnapshot(input: ExtractInput): Promise<RenderedSnapshot> {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const clean = (value: string | null | undefined) =>
    (value ?? "").replace(/\s+/g, " ").trim();

  const rectOf = (element: Element | null): RenderedRect | null => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  };

  const visible = (element: Element | null): element is HTMLElement => {
    if (!element || !(element instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(element);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number.parseFloat(style.opacity || "1") < 0.05
    ) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const textOf = (element: Element | null) =>
    clean(
      element instanceof HTMLElement
        ? element.innerText
        : element?.textContent ?? "",
    );

  const findFirstVisible = (selectors: string[]) => {
    for (const selector of selectors) {
      let nodes: Element[] = [];
      try {
        nodes = Array.from(document.querySelectorAll(selector));
      } catch {
        continue;
      }
      const found = nodes.find((node) => visible(node));
      if (found) return found;
    }
    return null;
  };

  const atcSelectors = [
    'button[name="add"]',
    'input[type="submit"][name="add"]',
    'form[action*="/cart/add"] button[type="submit"]',
    'form[action*="/cart/add"] input[type="submit"]',
    'button[id*="add-to-cart" i]',
    'button[class*="add-to-cart" i]',
    '[data-add-to-cart]',
  ];

  let atc: Element | null = findFirstVisible(atcSelectors);

  if (!atc) {
    const candidates = Array.from(
      document.querySelectorAll('button, a, input[type="submit"], [role="button"]'),
    );
    atc =
      candidates.find((node) => {
        if (!visible(node)) return false;
        const label = clean(
          node instanceof HTMLInputElement
            ? node.value
            : node.textContent,
        );
        return /^(add to (cart|bag|basket)|buy (it )?now|add to order)$/i.test(
          label,
        );
      }) ?? null;
  }

  const atcRect = rectOf(atc);
  const atcLabel = clean(
    atc instanceof HTMLInputElement
      ? atc.value
      : atc instanceof HTMLElement
        ? atc.innerText || atc.getAttribute("aria-label")
        : "",
  ).slice(0, 80) || null;

  const title =
    findFirstVisible(["h1", '[class*="product__title"]', '[class*="product-title"]']) ??
    null;
  const titleText = textOf(title).slice(0, 160) || null;
  const titleRect = rectOf(title);

  const priceSelectors = [
    '[itemprop="price"]',
    '[data-product-price]',
    '[data-testid*="price" i]',
    '[class*="price__regular"]',
    '[class*="price-item"]',
    '[class*="product__price"]',
    '[class*="product-price"]',
    '[class*="price"]',
  ];

  const amountPattern = /(?:\$|£|€|₹|A\$|C\$)\s?\d[\d,.]*|\d[\d,.]*\s?(?:USD|EUR|GBP|AUD|CAD|INR)/i;
  const priceOnlyPattern = /^(?:[^\d]{0,20})?(?:\$|£|€|₹|A\$|C\$)\s?\d[\d,.]*(?:\s?(?:USD|EUR|GBP|AUD|CAD|INR))?$/i;

  let price: HTMLElement | null = null;
  let priceText: string | null = null;

  for (const selector of priceSelectors) {
    let nodes: Element[] = [];
    try {
      nodes = Array.from(document.querySelectorAll(selector));
    } catch {
      continue;
    }

    const match = nodes.find((node) => {
      if (!visible(node)) return false;
      const text = textOf(node);
      return text.length > 0 && text.length < 60 && amountPattern.test(text);
    });

    if (match) {
      price = match as HTMLElement;
      priceText = textOf(match).slice(0, 60);
      break;
    }
  }

  // Many themes wrap the price in utility classes that do not contain "price".
  // Fall back to a visible element whose text is only a currency amount, near
  // the title or in the first screen.
  if (!priceText) {
    const titleBottom = titleRect ? titleRect.y + titleRect.height : 0;
    const candidates: Array<{ element: HTMLElement; distance: number }> = [];

    for (const node of Array.from(document.querySelectorAll("body *")).slice(0, 4_000)) {
      if (!(node instanceof HTMLElement) || !visible(node)) continue;
      const text = textOf(node);
      if (text.length === 0 || text.length > 40) continue;
      if (!priceOnlyPattern.test(text)) continue;
      if (node.children.length > 2) continue;
      const rect = node.getBoundingClientRect();
      if (rect.top < 0 || rect.top > viewportHeight * 1.5) continue;
      const distance = Math.max(0, Math.abs(rect.top - titleBottom));
      candidates.push({ element: node, distance });
    }

    candidates.sort((a, b) => a.distance - b.distance);
    if (candidates.length > 0) {
      price = candidates[0].element;
      priceText = textOf(price).slice(0, 60);
    }
  }

  const priceRect = rectOf(price);

  const compareSelectors = [
    '[class*="compare"]',
    '[class*="old-price"]',
    '[class*="price--compare"]',
    "s",
    "del",
  ];

  let compareAtText: string | null = null;
  for (const selector of compareSelectors) {
    let nodes: Element[] = [];
    try {
      nodes = Array.from(document.querySelectorAll(selector));
    } catch {
      continue;
    }
    const match = nodes.find(
      (node) => visible(node) && amountPattern.test(textOf(node)),
    );
    if (match) {
      compareAtText = textOf(match).slice(0, 60);
      break;
    }
  }

  const buyBoxRect = atcRect
    ? {
        x: atcRect.x,
        y: atcRect.y,
        width: atcRect.width,
        height: atcRect.height,
      }
    : null;

  if (buyBoxRect) {
    buyBoxRect.x = Math.max(0, buyBoxRect.x - 40);
    buyBoxRect.y = Math.max(0, buyBoxRect.y - 220);
    buyBoxRect.width += 80;
    buyBoxRect.height += 320;
  }

  const intersects = (rect: DOMRect | RenderedRect, box: RenderedRect) =>
    rect.x < box.x + box.width &&
    rect.x + rect.width > box.x &&
    rect.y < box.y + box.height &&
    rect.y + rect.height > box.y;

  const pageHeight = document.documentElement.scrollHeight;
  const footerTop = Math.max(0, pageHeight - 900);

  const locationOf = (element: Element | null, rect: DOMRect | null): RenderedLocation => {
    if (!element || !rect) return "not-found";
    if (element.closest("footer") || rect.top >= footerTop) return "footer-only";
    if (buyBoxRect && intersects(rect, buyBoxRect)) return "near-buy-box";
    if (rect.bottom <= viewportHeight) return "above-fold";
    return "below-fold";
  };

  const texts = {
    "above-fold": [] as string[],
    "near-buy-box": [] as string[],
    "below-fold": [] as string[],
    "footer-only": [] as string[],
    "page-wide": [] as string[],
    "not-found": [] as string[],
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const value = clean(node.nodeValue);
      if (value.length < 2 || value.length > 300) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (/^(script|style|noscript|template)$/i.test(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let blockCount = 0;
  const seen = new Set<string>();

  while (walker.nextNode() && blockCount < input.maxTextBlocks) {
    const parent = walker.currentNode.parentElement;
    if (!parent || !visible(parent)) continue;
    const value = clean(walker.currentNode.nodeValue);
    const location = locationOf(parent, parent.getBoundingClientRect());
    const key = `${location}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    texts[location].push(value);
    blockCount += 1;
  }

  const join = (values: string[]) => values.join(" \u00b7 ").slice(0, 60_000);

  // Overlay check before scrolling so it reflects the first screen.
  let overlayCoverage = 0;
  let overlayText: string | null = null;

  const candidates = Array.from(document.querySelectorAll("body *")).slice(0, 4_000);
  for (const element of candidates) {
    if (!visible(element)) continue;
    const style = window.getComputedStyle(element);
    if (style.position !== "fixed" && style.position !== "sticky") continue;
    if (style.pointerEvents === "none") continue;
    const zIndex = Number.parseInt(style.zIndex || "0", 10);
    if (!Number.isFinite(zIndex) || zIndex < 5) continue;
    const rect = element.getBoundingClientRect();
    if (rect.height < 80 || rect.width < 200) continue;
    const width = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
    const height = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
    if (width <= 0 || height <= 0) continue;
    const coverage = (width * height) / (viewportWidth * viewportHeight);
    if (coverage > overlayCoverage) {
      overlayCoverage = coverage;
      overlayText = clean(element.innerText).slice(0, 160) || null;
    }
  }

  // Product images, de-duplicated by current source.
  const imageSelectors = [
    'img[src*="/products/"]',
    '[class*="product__media"] img',
    '[class*="product-media"] img',
    '[class*="product-gallery"] img',
    '[class*="product-gallery"] img',
    '[data-media-id] img',
    "media img",
  ];

  const productImages = new Map<string, HTMLImageElement>();
  for (const selector of imageSelectors) {
    let nodes: Element[] = [];
    try {
      nodes = Array.from(document.querySelectorAll(selector));
    } catch {
      continue;
    }
    for (const node of nodes) {
      if (!(node instanceof HTMLImageElement)) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < 80 || rect.height < 80) continue;
      const source = node.currentSrc || node.src;
      if (source && !productImages.has(source)) productImages.set(source, node);
    }
  }

  // If the theme uses unusual markup, fall back to large images near the title.
  if (productImages.size === 0) {
    for (const node of Array.from(document.images).slice(0, 80)) {
      const rect = node.getBoundingClientRect();
      if (rect.width >= 180 && rect.height >= 180) {
        productImages.set(node.currentSrc || node.src, node);
      }
    }
  }

  const productImagesWithAlt = Array.from(productImages.values()).filter(
    (image) => clean(image.alt).length > 0,
  ).length;

  const videoDetected = Boolean(
    findFirstVisible(["video", 'iframe[src*="youtube"]', 'iframe[src*="vimeo"]']),
  );

  const variantSelectorDetected = Boolean(
    findFirstVisible([
      'select[name*="option" i]',
      'select[id*="option" i]',
      'input[type="radio"][name*="option" i]',
      '[class*="variant"] select',
      '[class*="swatch"] input',
      '[class*="swatch"] button',
      'fieldset input[type="radio"]',
    ]),
  );

  let variantPreselected: boolean | null = null;
  if (variantSelectorDetected) {
    const checked = document.querySelector(
      'input[type="radio"]:checked, input[type="radio"][aria-checked="true"]',
    );
    const select = document.querySelector<HTMLSelectElement>(
      'select[name*="option" i], select[id*="option" i], [class*="variant"] select',
    );
    variantPreselected = Boolean(
      checked ||
        (select && (select.value || select.selectedIndex > 0)) ||
        document.querySelector('[aria-checked="true"][class*="swatch"]'),
    );
  }

  let discountBadgeDetected = false;
  let discountBadgeText: string | null = null;

  if (buyBoxRect) {
    for (const element of Array.from(document.querySelectorAll("body *")).slice(0, 4_000)) {
      if (!visible(element)) continue;
      const rect = element.getBoundingClientRect();
      if (!intersects(rect, buyBoxRect)) continue;
      const text = textOf(element);
      if (
        text.length > 0 &&
        text.length <= 72 &&
        /(?:\d+\s?%\s?off|save\s?(?:\$|£|€)?\s?\d|sale|clearance|deal)/i.test(text) &&
        element.children.length <= 2
      ) {
        discountBadgeDetected = true;
        discountBadgeText = text;
        break;
      }
    }
  }

  if (!discountBadgeDetected && compareAtText && priceText) {
    const number = (value: string) =>
      Number.parseFloat(value.replace(/[^\d.]/g, "")) || 0;
    if (number(compareAtText) > number(priceText)) {
      discountBadgeDetected = true;
      discountBadgeText = `${priceText} vs ${compareAtText}`;
    }
  }

  // Description container and list items.
  const description = findFirstVisible([
    '[class*="product__description"]',
    '[class*="product-description"]',
    '[class*="product-single__description"]',
    '[class*="product-detail"]',
    '[class*="product-details"]',
    '[class*="description" i]',
    '[class*="accordion"]',
    '[data-testid*="description" i]',
    '[data-cy*="description" i]',
    '[id*="description" i]',
    '[itemprop="description"]',
    ".rte",
  ]);
  const descriptionTextLength = description
    ? clean(description.textContent).length
    : 0;
  const descriptionBulletCount = description
    ? description.querySelectorAll("li").length
    : 0;

  const buttons = Array.from(
    document.querySelectorAll('button, a[role="button"], input[type="submit"]'),
  )
    .filter((node) => visible(node))
    .map((node) =>
      clean(
        node instanceof HTMLInputElement ? node.value : node.textContent,
      ).slice(0, 80),
    )
    .filter(Boolean)
    .slice(0, input.maxButtons);

  const markers: SnapshotMarker[] = [];

  for (const marker of input.markers) {
    const element = findFirstVisible(marker.selectors);
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    const isScript = element.tagName.toLowerCase() === "script";
    const location = isScript
      ? "page-wide"
      : locationOf(element, rect);
    const evidence = clean(
      element.getAttribute("alt") ||
        element.getAttribute("aria-label") ||
        element.getAttribute("src") ||
        element.className ||
        element.textContent,
    ).slice(0, 140);

    markers.push({
      id: marker.id,
      evidence: evidence || `Matched ${marker.selectors[0]}`,
      location,
    });
  }

  // Sticky add-to-cart check after a bounded scroll.
  let stickyAddToCartDetected = false;
  let stickyAddToCartLabel: string | null = null;

  const stickyAtcSelectors = [
    ...atcSelectors,
    '[class*="sticky"] button',
    '[class*="sticky"] a[href*="/cart/add"]',
  ];

  const detectSticky = () => {
    for (const selector of stickyAtcSelectors) {
      let nodes: Element[] = [];
      try {
        nodes = Array.from(document.querySelectorAll(selector));
      } catch {
        continue;
      }
      for (const node of nodes) {
        if (!visible(node)) continue;
        const rect = node.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > viewportHeight) continue;
        const style = window.getComputedStyle(node);
        const fixedAncestor = (() => {
          let parent: Element | null = node;
          while (parent && parent !== document.body) {
            const parentStyle = window.getComputedStyle(parent);
            if (parentStyle.position === "fixed" || parentStyle.position === "sticky") {
              return true;
            }
            parent = parent.parentElement;
          }
          return false;
        })();

        if (style.position === "fixed" || fixedAncestor) {
          stickyAddToCartDetected = true;
          stickyAddToCartLabel = clean(
            node instanceof HTMLInputElement ? node.value : node.textContent,
          ).slice(0, 80);
          return;
        }
      }
    }
  };

  window.scrollTo(0, Math.min(1_400, pageHeight));
  await sleep(450);
  detectSticky();
  window.scrollTo(0, 0);
  await sleep(120);

  return {
    finalUrl: window.location.href,
    documentTitle: clean(document.title).slice(0, 200),
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth,
    viewportHeight,
    pageHeight,
    titleText,
    priceText,
    compareAtText,
    titleRect,
    priceRect,
    addToCartRect: atcRect,
    addToCartLabel: atcLabel,
    addToCartAboveFold: Boolean(atcRect && atcRect.y + atcRect.height <= viewportHeight),
    stickyAddToCartDetected,
    stickyAddToCartLabel,
    productImageCount: productImages.size,
    productImagesWithAlt,
    videoDetected,
    variantSelectorDetected,
    variantPreselected,
    discountBadgeDetected,
    discountBadgeText,
    overlayCoverage,
    overlayText,
    horizontalOverflow:
      document.documentElement.scrollWidth > viewportWidth + 1,
    descriptionTextLength,
    descriptionBulletCount,
    buttons,
    texts: {
      aboveFold: join(texts["above-fold"]),
      nearBuyBox: join(texts["near-buy-box"]),
      belowFold: join(texts["below-fold"]),
      footer: join(texts["footer-only"]),
      pageWide: join(texts["page-wide"]),
    },
    markers,
  };
}

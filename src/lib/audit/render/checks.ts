import { CRO_THRESHOLDS } from "@/lib/audit/thresholds";
import type {
  AuditCheck,
  AuditFixTracks,
  RenderedSignal,
  RenderedSignalGroup,
} from "@/lib/audit/types";
import type { RenderedSnapshot } from "@/lib/audit/render/extract";
import { locationText } from "@/lib/audit/render/signals";

const SNIPPET_LABEL = "Example - adapt to your theme, back up first";

type CheckInput = {
  id: string;
  title: string;
  category: AuditCheck["category"];
  status: AuditCheck["status"];
  severity: AuditCheck["severity"];
  summary: string;
  evidence: string[];
  whyItMatters: string;
  fixTracks: AuditFixTracks;
};

function makeCheck(input: CheckInput): AuditCheck {
  return {
    id: input.id,
    title: input.title,
    category: input.category,
    status: input.status,
    severity: input.severity,
    summary: input.summary,
    evidence: input.evidence,
    recommendation: input.fixTracks.storeOwner[0],
    whyItMatters: input.whyItMatters,
    fixTracks: input.fixTracks,
    fixSteps: input.fixTracks.storeOwner,
    source: "rendered",
  };
}

function rectEvidence(label: string, rect: { x: number; y: number; width: number; height: number } | null) {
  if (!rect) return `${label}: not found`;
  return `${label}: top ${rect.y}px, ${rect.width} × ${rect.height}px`;
}

function overflowEvidence(snapshot: RenderedSnapshot, rect: { y: number; height: number } | null) {
  if (!rect) return "Not measurable because the element was missing.";
  const bottom = rect.y + rect.height;
  return bottom <= snapshot.viewportHeight
    ? `Bottom edge at ${bottom}px, inside the ${snapshot.viewportHeight}px first screen.`
    : `Bottom edge at ${bottom}px, below the ${snapshot.viewportHeight}px first screen.`;
}

function groupSignals(signals: RenderedSignal[], group: RenderedSignalGroup) {
  return signals.filter((signal) => signal.group === group);
}

function signalEvidence(signals: RenderedSignal[], limit = 8) {
  return signals
    .slice(0, limit)
    .map(
      (signal) =>
        `${signal.label}: ${signal.status === "detected" ? "detected" : signal.status === "unable" ? "unable to verify" : "not found"} (${locationText(signal.location)})`,
    );
}

export function buildRenderedChecks(
  snapshot: RenderedSnapshot,
  signals: RenderedSignal[],
): AuditCheck[] {
  const checks: AuditCheck[] = [];
  const atc = snapshot.addToCartRect;
  const price = snapshot.priceRect;
  const title = snapshot.titleRect;

  const titleAbove = Boolean(
    title && title.y + title.height <= snapshot.viewportHeight,
  );
  const priceAbove = Boolean(
    price && price.y + price.height <= snapshot.viewportHeight,
  );

  const keyParts = [
    rectEvidence("Title", title),
    rectEvidence("Price", price),
    rectEvidence("Add to cart", atc),
  ];

  if (!atc) {
    checks.push(
      makeCheck({
        id: "render-above-fold",
        title: "Above-the-fold buying information",
        category: "above-fold",
        status: "fail",
        severity: "high",
        summary:
          "No add-to-cart control was found in the rendered mobile page, so the main purchase action could not be seen.",
        evidence: [...keyParts, overflowEvidence(snapshot, price)],
        whyItMatters:
          "On a phone, shoppers need to understand the product and see the purchase action without hunting through the page.",
        fixTracks: {
          storeOwner: [
            "Open Online Store > Themes > Customize and open the product page template.",
            "Confirm the product title, price, and buy-buttons blocks are enabled and near the top of the product section.",
            "Reduce oversized banners, announcement bars, or image blocks above the buy buttons if they push the action off-screen.",
            "Check the mobile preview, then re-run the rendered audit.",
          ],
          developer: {
            steps: [
              "Inspect sections/main-product.liquid and the product template JSON for the block order.",
              "Make the product information column come before large media or promotional sections on mobile.",
              "Back up the theme and test on a duplicate theme before publishing.",
            ],
            snippet: {
              label: SNIPPET_LABEL,
              language: "css",
              code: ".product__info-wrapper {\n  padding-top: 8px;\n}\n\n@media (max-width: 749px) {\n  .product__media-wrapper {\n    margin-bottom: 12px;\n  }\n}",
            },
          },
        },
      }),
    );
  } else if (!snapshot.addToCartAboveFold || !priceAbove) {
    checks.push(
      makeCheck({
        id: "render-above-fold",
        title: "Above-the-fold buying information",
        category: "above-fold",
        status: "fail",
        severity: "high",
        summary:
          "The add-to-cart button or price starts below the first mobile screen.",
        evidence: [...keyParts, overflowEvidence(snapshot, atc)],
        whyItMatters:
          "A shopper who cannot see the price and purchase action on the first screen has to scroll and interpret the page before acting.",
        fixTracks: {
          storeOwner: [
            "Open Online Store > Themes > Customize and preview the product template on mobile.",
            "Move the buy-buttons block directly under the title and price, before long description or promotional blocks.",
            "Shorten the content above the buy box, such as announcement bars or oversized hero images.",
            "Re-run the rendered audit and compare the measured positions.",
          ],
          developer: {
            steps: [
              "Check the product template block order and the mobile CSS grid for the product section.",
              "Avoid fixed-height media wrappers that push the form below the viewport.",
              "Keep the price and variant picker adjacent to the submit button.",
            ],
            snippet: {
              label: SNIPPET_LABEL,
              language: "css",
              code: "@media (max-width: 749px) {\n  .product__info-wrapper {\n    order: -1;\n  }\n}",
            },
          },
        },
      }),
    );
  } else if (!titleAbove || !title) {
    checks.push(
      makeCheck({
        id: "render-above-fold",
        title: "Above-the-fold buying information",
        category: "above-fold",
        status: "warning",
        severity: "low",
        summary:
          "The purchase action and price are visible on the first screen, but the product title is not.",
        evidence: [...keyParts, overflowEvidence(snapshot, title)],
        whyItMatters:
          "Without the product name in view, a shopper may not be sure what they are about to buy.",
        fixTracks: {
          storeOwner: [
            "Open the product template in the theme editor.",
            "Keep the product title near the top of the information column on mobile.",
            "Re-run the audit to confirm the title is inside the first screen.",
          ],
          developer: {
            steps: [
              "Check whether the title block is hidden or duplicated on mobile.",
              "Keep one visible product H1 near the buy box.",
            ],
          },
        },
      }),
    );
  } else {
    checks.push(
      makeCheck({
        id: "render-above-fold",
        title: "Above-the-fold buying information",
        category: "above-fold",
        status: "pass",
        severity: "none",
        summary:
          "Title, price, and add-to-cart were all measured inside the first mobile screen.",
        evidence: keyParts,
        whyItMatters:
          "Seeing the product, price, and purchase action together reduces uncertainty on a small screen.",
        fixTracks: {
          storeOwner: [
            "No change is needed based on this measurement. Re-check after major theme or app changes.",
          ],
          developer: {
            steps: [
              "Keep the buy box above large media or promotional blocks on mobile.",
            ],
          },
        },
      }),
    );
  }

  if (!atc) {
    checks.push(
      makeCheck({
        id: "render-buy-button",
        title: "Add-to-cart tap target",
        category: "mobile",
        status: "not-checked",
        severity: "unknown",
        summary: "The size of the add-to-cart control could not be measured.",
        evidence: ["No add-to-cart element was found in the rendered page."],
        whyItMatters:
          "A small or unclear purchase control is harder to tap accurately.",
        fixTracks: {
          storeOwner: [
            "Confirm the product template has a buy-buttons block enabled.",
            "Check the product page on a real phone.",
          ],
          developer: {
            steps: ["Verify the product form is rendered and not hidden by app JavaScript."],
          },
        },
      }),
    );
  } else {
    const tooSmall =
      atc.width < CRO_THRESHOLDS.tapTargetMinPx ||
      atc.height < CRO_THRESHOLDS.tapTargetMinPx;
    const label = snapshot.addToCartLabel;

    checks.push(
      makeCheck({
        id: "render-buy-button",
        title: "Add-to-cart tap target",
        category: "mobile",
        status: tooSmall ? "fail" : "pass",
        severity: tooSmall ? "medium" : "none",
        summary: tooSmall
          ? `The add-to-cart control is ${atc.width} × ${atc.height}px, below the ${CRO_THRESHOLDS.tapTargetMinPx}px editorial tap-target guideline.`
          : `The add-to-cart control is ${atc.width} × ${atc.height}px and meets the ${CRO_THRESHOLDS.tapTargetMinPx}px guideline.`,
        evidence: [
          rectEvidence("Add to cart", atc),
          `Visible label: ${label ?? "not readable"}`,
          `Guideline: at least ${CRO_THRESHOLDS.tapTargetMinPx} × ${CRO_THRESHOLDS.tapTargetMinPx}px.`,
        ],
        whyItMatters:
          "A comfortably sized button is easier to hit with a thumb, especially one-handed.",
        fixTracks: {
          storeOwner: [
            "Open Online Store > Themes > Customize and review the buy-buttons block on mobile.",
            "Avoid narrow or icon-only add-to-cart controls on product pages.",
            "Ask your theme developer to increase the button height if the theme does not expose it.",
          ],
          developer: {
            steps: [
              "Give the submit button a minimum height and full-width layout on mobile.",
              "Keep a clear text label rather than an icon alone.",
            ],
            snippet: {
              label: SNIPPET_LABEL,
              language: "css",
              code: ".product-form__submit {\n  min-height: 44px;\n  min-width: 44px;\n  width: 100%;\n}",
            },
          },
        },
      }),
    );
  }

  checks.push(
    makeCheck({
      id: "render-sticky-atc",
      title: "Sticky add-to-cart after scrolling",
      category: "mobile",
      status: snapshot.stickyAddToCartDetected ? "pass" : "warning",
      severity: snapshot.stickyAddToCartDetected ? "none" : "low",
      summary: snapshot.stickyAddToCartDetected
        ? "A fixed or sticky purchase control stayed visible after scrolling."
        : "No fixed or sticky add-to-cart control stayed visible after scrolling.",
      evidence: snapshot.stickyAddToCartDetected
        ? [
            `Sticky control label: ${snapshot.stickyAddToCartLabel ?? "not readable"}`,
            "Detected after scrolling 1,400px in a 390 × 844 viewport.",
          ]
        : [
            "No fixed or sticky add-to-cart control was visible after scrolling.",
            "A sticky bar is optional; some themes intentionally omit it.",
          ],
      whyItMatters:
        "A sticky purchase control can save a long scroll back to the buy box, but it is not required for a clear page.",
      fixTracks: {
        storeOwner: [
          "Check whether your theme has a sticky add-to-cart setting under Online Store > Themes > Customize.",
          "If you add a sticky bar, keep it small and make sure it does not cover content or the cookie banner.",
          "Test it on a real phone before publishing.",
        ],
        developer: {
          steps: [
            "Use position: sticky on a compact buy bar, or a theme setting if one exists.",
            "Respect safe-area insets and avoid covering the footer or chat widget.",
          ],
          snippet: {
            label: SNIPPET_LABEL,
            language: "css",
            code: ".product-sticky-bar {\n  position: sticky;\n  bottom: 0;\n  z-index: 20;\n  padding-bottom: env(safe-area-inset-bottom);\n}",
          },
        },
      },
    }),
  );

  checks.push(
    makeCheck({
      id: "render-product-images",
      title: "Product image coverage",
      category: "product-content",
      status:
        snapshot.productImageCount === 0
          ? "fail"
          : snapshot.productImageCount < CRO_THRESHOLDS.productImagesRecommended ||
              snapshot.productImagesWithAlt < snapshot.productImageCount
            ? "warning"
            : "pass",
      severity:
        snapshot.productImageCount === 0
          ? "medium"
          : snapshot.productImageCount < CRO_THRESHOLDS.productImagesRecommended
            ? "medium"
            : snapshot.productImagesWithAlt < snapshot.productImageCount
              ? "low"
              : "none",
      summary:
        snapshot.productImageCount === 0
          ? "No product images were measured in the rendered page."
          : `${snapshot.productImageCount} product image${snapshot.productImageCount === 1 ? "" : "s"} measured, ${snapshot.productImagesWithAlt} with alt text.`,
      evidence: [
        `Images measured: ${snapshot.productImageCount}`,
        `Images with alt text: ${snapshot.productImagesWithAlt}`,
        `Editorial guideline: at least ${CRO_THRESHOLDS.productImagesRecommended} distinct images.`,
        `Video or video embed: ${snapshot.videoDetected ? "detected" : "not found"}`,
      ],
      whyItMatters:
        "Product photos are the closest a shopper can get to inspecting the item before buying.",
      fixTracks: {
        storeOwner: [
          "Open Products > the product > Media and review the image set.",
          `Aim for at least ${CRO_THRESHOLDS.productImagesRecommended} useful images where the product allows it: overview, detail, scale, and in-use.`,
          "Add descriptive alt text to each meaningful image.",
          "Save and re-run the rendered audit.",
        ],
        developer: {
          steps: [
            "Check that the theme gallery renders every product media item on mobile.",
            "Do not lazy-load the first product image in a way that hides it from the initial render.",
          ],
        },
      },
    }),
  );

  checks.push(
    makeCheck({
      id: "render-variants",
      title: "Variant selector and preselection",
      category: "product-content",
      status: snapshot.variantSelectorDetected
        ? snapshot.variantPreselected === false
          ? "warning"
          : "pass"
        : "not-checked",
      severity: snapshot.variantSelectorDetected
        ? snapshot.variantPreselected === false
          ? "low"
          : "none"
        : "unknown",
      summary: snapshot.variantSelectorDetected
        ? snapshot.variantPreselected === false
          ? "Variant controls were found, but no default option appeared to be selected."
          : "Variant controls were found with a selected option."
        : "No variant selector was found; the product may be sold as a single variant.",
      evidence: [
        `Variant controls: ${snapshot.variantSelectorDetected ? "detected" : "not found"}`,
        `Preselected option: ${
          snapshot.variantPreselected === null
            ? "not measurable"
            : snapshot.variantPreselected
              ? "yes"
              : "no"
        }`,
      ],
      whyItMatters:
        "A clear default choice lets a shopper add the intended item without first solving the variant picker.",
      fixTracks: {
        storeOwner: [
          "Open Products > the product > Variants and confirm the options customers should choose.",
          "Check the product page on mobile and make sure a sensible option is selected by default.",
          "If the product is single-variant, no variant selector is expected.",
        ],
        developer: {
          steps: [
            "Keep the selected variant reflected in the picker and in the hidden variant id input.",
            "Do not render an empty swatch set before JavaScript hydrates.",
          ],
        },
      },
    }),
  );

  checks.push(
    makeCheck({
      id: "render-price",
      title: "Visible price and discount context",
      category: "offers",
      status: price ? "pass" : "fail",
      severity: price ? "none" : "high",
      summary: price
        ? `A price was visible: ${snapshot.priceText ?? "amount measured"}.`
        : "No price was measured in the rendered mobile page.",
      evidence: [
        rectEvidence("Price", price),
        `Compare-at text: ${snapshot.compareAtText ?? "not found"}`,
        `Discount badge: ${
          snapshot.discountBadgeDetected
            ? snapshot.discountBadgeText ?? "detected"
            : "not detected"
        }`,
      ],
      whyItMatters:
        "The price is a primary decision input and should be readable at the point of purchase.",
      fixTracks: {
        storeOwner: [
          "Open the product in Shopify admin and confirm a price is set for every variant.",
          "Check the product template in the theme editor to make sure the price block is enabled.",
          "Only show a compare-at price when it is a genuine regular price.",
        ],
        developer: {
          steps: [
            "Check whether the price element is hidden by CSS or overwritten by a currency app.",
            "Keep the discounted and compare-at values clearly associated with the selected variant.",
          ],
        },
      },
    }),
  );

  checks.push(
    makeCheck({
      id: "render-overflow",
      title: "Horizontal overflow on mobile",
      category: "mobile",
      status: snapshot.horizontalOverflow ? "fail" : "pass",
      severity: snapshot.horizontalOverflow ? "high" : "none",
      summary: snapshot.horizontalOverflow
        ? `The rendered page is wider than the mobile viewport (${snapshot.scrollWidth}px vs ${snapshot.viewportWidth}px).`
        : "The rendered page did not scroll sideways at 390px width.",
      evidence: [
        `Document width: ${snapshot.scrollWidth}px`,
        `Viewport width: ${snapshot.viewportWidth}px`,
        `Page height: ${snapshot.pageHeight}px`,
      ],
      whyItMatters:
        "Sideways scrolling makes content feel broken and can push the buy box partly off-screen.",
      fixTracks: {
        storeOwner: [
          "Open the product page on a phone and look for content that extends past the right edge.",
          "Check recently added apps, wide tables, and long words or URLs in the description.",
          "Ask your theme developer to constrain the offending element.",
        ],
        developer: {
          steps: [
            "Find the widest element with document.documentElement.scrollWidth > innerWidth.",
            "Constrain media, tables, and long text; avoid fixed pixel widths above 390px.",
          ],
          snippet: {
            label: SNIPPET_LABEL,
            language: "css",
            code: "img, video, iframe, table {\n  max-width: 100%;\n}\n\nbody {\n  overflow-x: hidden;\n}",
          },
        },
      },
    }),
  );

  const overlayPercent = Math.round(snapshot.overlayCoverage * 100);
  const overlayTooLarge =
    snapshot.overlayCoverage > CRO_THRESHOLDS.overlayMaxCoverage;
  const overlayNoticeable = snapshot.overlayCoverage > 0.1;

  checks.push(
    makeCheck({
      id: "render-overlay",
      title: "Popups or banners covering the first screen",
      category: "mobile",
      status: overlayTooLarge ? "warning" : "pass",
      severity: overlayTooLarge ? "medium" : overlayNoticeable ? "low" : "none",
      summary: overlayTooLarge
        ? `A fixed or sticky element covered about ${overlayPercent}% of the first mobile screen.`
        : overlayNoticeable
          ? `A fixed or sticky element covered about ${overlayPercent}% of the first mobile screen.`
          : "No large fixed overlay was measured on the first mobile screen.",
      evidence: [
        `Estimated coverage: ${overlayPercent}% of 390 × 844.`,
        `Element text: ${snapshot.overlayText ?? "not readable"}`,
        `Editorial guideline: keep non-essential overlays below ${Math.round(CRO_THRESHOLDS.overlayMaxCoverage * 100)}%.`,
      ],
      whyItMatters:
        "A popup or banner can hide the product and purchase controls exactly when a shopper arrives.",
      fixTracks: {
        storeOwner: [
          "Check which popup, cookie, or announcement apps are active on the product page.",
          "Delay non-essential popups, or make them smaller and easy to close on mobile.",
          "Keep any legally required cookie banner, but avoid stacking several overlays.",
        ],
        developer: {
          steps: [
            "Audit fixed-position elements and their z-index on mobile.",
            "Never open a promotional modal before the product information is visible.",
          ],
        },
      },
    }),
  );

  const trust = groupSignals(signals, "trust");
  const trustDetected = trust.filter((signal) => signal.status === "detected");

  checks.push(
    makeCheck({
      id: "render-trust",
      title: "Trust and guarantee signals",
      category: "trust",
      status: trustDetected.length > 0 ? "pass" : "warning",
      severity: trustDetected.length > 0 ? "none" : "medium",
      summary:
        trustDetected.length > 0
          ? `${trustDetected.length} of ${trust.length} trust signals were detected in the rendered page.`
          : "No trust or guarantee signals were found in the rendered page.",
      evidence: signalEvidence(trust),
      whyItMatters:
        "Reassurance about payment safety, guarantees, and policies helps an unfamiliar shopper judge whether the store is credible.",
      fixTracks: {
        storeOwner: [
          "Decide which reassurance matters for this product: secure payment, returns, warranty, or a genuine guarantee.",
          "Add the strongest one near the buy box, not only in the footer.",
          "Keep the wording accurate and link to the full policy.",
        ],
        developer: {
          steps: [
            "Place trust content in the product information column near the buy buttons.",
            "Use real badge assets and accessible alt text; do not add unearned seals.",
          ],
        },
      },
    }),
  );

  const shipping = groupSignals(signals, "shipping-returns");
  const shippingDetected = shipping.filter((signal) => signal.status === "detected");
  const shippingNearby = shippingDetected.some(
    (signal) =>
      signal.location === "near-buy-box" || signal.location === "above-fold",
  );

  checks.push(
    makeCheck({
      id: "render-shipping-returns",
      title: "Shipping and returns information",
      category: "trust",
      status:
        shippingDetected.length === 0
          ? "warning"
          : shippingNearby
            ? "pass"
            : "warning",
      severity:
        shippingDetected.length === 0
          ? "medium"
          : shippingNearby
            ? "none"
            : "low",
      summary:
        shippingDetected.length === 0
          ? "No free-shipping, delivery, or returns messaging was found in the rendered page."
          : shippingNearby
            ? "Shipping or returns information was detected near the buy box or first screen."
            : "Shipping or returns information was found only below the fold, in the footer, or in an app script.",
      evidence: signalEvidence(shipping),
      whyItMatters:
        "Delivery cost and return expectations are common reasons shoppers pause or leave before buying.",
      fixTracks: {
        storeOwner: [
          "Open Settings > Policies and confirm shipping and return details are accurate.",
          "Add the key delivery and return points near the buy box, then link to the full policy.",
          "Avoid promising timings the store cannot consistently meet.",
        ],
        developer: {
          steps: [
            "Place a short shipping/returns line under the buy buttons using theme settings or a metafield.",
            "Keep policy links crawlable and visible on mobile.",
          ],
        },
      },
    }),
  );

  const social = groupSignals(signals, "social-proof");
  const socialDetected = social.filter((signal) => signal.status === "detected");

  checks.push(
    makeCheck({
      id: "render-social-proof",
      title: "Reviews and social proof",
      category: "social-proof",
      status: socialDetected.length > 0 ? "pass" : "warning",
      severity: socialDetected.length > 0 ? "none" : "medium",
      summary:
        socialDetected.length > 0
          ? `${socialDetected.length} review or social-proof signals were detected.`
          : "No review stars, review widget, or visible customer count was found in the rendered page.",
      evidence: signalEvidence(social),
      whyItMatters:
        "Reviews and visible customer evidence give a shopper outside opinions about the product.",
      fixTracks: {
        storeOwner: [
          "If you already collect reviews, check that the review app is visible on the product page.",
          "Show the rating and review count near the title or buy box.",
          "Never publish invented reviews, counts, or ratings.",
        ],
        developer: {
          steps: [
            "Check whether the review app renders after JavaScript or only on certain templates.",
            "Keep review markup and star ratings accessible to assistive technology.",
          ],
        },
      },
    }),
  );

  const offers = groupSignals(signals, "offers");
  const offersDetected = offers.filter((signal) => signal.status === "detected");

  checks.push(
    makeCheck({
      id: "render-offers",
      title: "Offers, bundles, and upsells",
      category: "offers",
      status: offersDetected.length > 0 ? "pass" : "pass",
      severity: "none",
      summary:
        offersDetected.length > 0
          ? `${offersDetected.length} offer or upsell signals were detected.`
          : "No offer, bundle, subscription, or upsell messaging was found in the rendered page.",
      evidence: signalEvidence(offers),
      whyItMatters:
        "A clear, genuine offer can help a shopper choose a quantity or bundle, but offers are optional.",
      fixTracks: {
        storeOwner: [
          "Only add an offer if it is genuinely available and easy to understand.",
          "Check that the offer is visible near the variant picker and reflected at checkout.",
        ],
        developer: {
          steps: [
            "Keep discount messaging tied to the selected variant and real cart rules.",
            "Do not inject countdown or stock messages that are not backed by real data.",
          ],
        },
      },
    }),
  );

  const urgency = groupSignals(signals, "urgency");
  const urgencyDetected = urgency.filter((signal) => signal.status === "detected");

  checks.push(
    makeCheck({
      id: "render-urgency",
      title: "Urgency and scarcity wording",
      category: "offers",
      status: "pass",
      severity: "none",
      summary:
        urgencyDetected.length > 0
          ? `${urgencyDetected.length} urgency or low-stock signal${urgencyDetected.length === 1 ? "" : "s"} were found.`
          : "No countdown or low-stock messaging was found in the rendered page.",
      evidence:
        urgencyDetected.length > 0
          ? [
              ...signalEvidence(urgency),
              "Confirm any urgency is genuine and tied to real dates or inventory.",
            ]
          : ["No urgency messaging found. This is not automatically a problem."],
      whyItMatters:
        "Urgency can help when it reflects real deadlines or stock, and damages trust when it is fabricated.",
      fixTracks: {
        storeOwner: [
          "Check that any countdown or low-stock message reflects real dates or inventory.",
          "Remove fake or permanently running urgency messaging.",
        ],
        developer: {
          steps: [
            "Drive urgency from real product or promotion data, not a repeating client-side timer.",
            "Never recommend adding invented scarcity.",
          ],
        },
      },
    }),
  );

  const contentGroup = groupSignals(signals, "product-content");
  const contentDetected = contentGroup.filter(
    (signal) => signal.status === "detected",
  );

  checks.push(
    makeCheck({
      id: "render-product-content",
      title: "Product content depth",
      category: "product-content",
      status:
        contentDetected.length >= 4
          ? "pass"
          : contentDetected.length >= 2
            ? "warning"
            : "warning",
      severity:
        contentDetected.length >= 4
          ? "none"
          : contentDetected.length >= 2
            ? "low"
            : "medium",
      summary: `${contentDetected.length} of ${contentGroup.length} product-content signals were detected (description depth, bullets, FAQ, size guide, specs, comparison, video, before/after, brand).`,
      evidence: signalEvidence(contentGroup, 10),
      whyItMatters:
        "Shoppers need enough detail to judge fit, function, and suitability without guessing.",
      fixTracks: {
        storeOwner: [
          "Open Products > the product > Description and answer the main buying questions.",
          "Add scannable bullets, and add an FAQ or size guide where the product needs one.",
          "Use real photos or video rather than generic filler.",
        ],
        developer: {
          steps: [
            "Keep description, metafields, and app blocks in a readable order on mobile.",
            "Use semantic lists, headings, and accessible accordions.",
          ],
        },
      },
    }),
  );

  const support = groupSignals(signals, "support");
  const supportDetected = support.filter((signal) => signal.status === "detected");
  const supportNearby = supportDetected.some(
    (signal) =>
      signal.location === "near-buy-box" || signal.location === "above-fold",
  );

  checks.push(
    makeCheck({
      id: "render-support",
      title: "Support and contact visibility",
      category: "trust",
      status: "pass",
      severity:
        supportDetected.length === 0
          ? "low"
          : supportNearby
            ? "none"
            : "low",
      summary:
        supportDetected.length === 0
          ? "No chat, WhatsApp, email, phone, or contact link was found in the rendered page."
          : `Support signals detected: ${supportDetected.map((signal) => signal.label).join(", ")}.`,
      evidence:
        supportDetected.length > 0
          ? signalEvidence(support)
          : [
              "Not found in the rendered page. This can be expected if support is handled elsewhere.",
            ],
      whyItMatters:
        "An easy way to ask a question reduces friction for shoppers who are unsure.",
      fixTracks: {
        storeOwner: [
          "Add a visible contact method that the store actually monitors.",
          "Put a help link near the buy box if questions are common for this product.",
        ],
        developer: {
          steps: [
            "Make the contact link keyboard accessible and visible on mobile.",
            "Avoid chat widgets that cover the buy button.",
          ],
        },
      },
    }),
  );

  const accelerated = groupSignals(signals, "accelerated-checkout");
  const acceleratedDetected = accelerated.filter(
    (signal) => signal.status === "detected",
  );

  checks.push(
    makeCheck({
      id: "render-accelerated-checkout",
      title: "Accelerated checkout options",
      category: "offers",
      status: acceleratedDetected.length > 0 ? "pass" : "warning",
      severity: acceleratedDetected.length > 0 ? "none" : "low",
      summary:
        acceleratedDetected.length > 0
          ? `Accelerated checkout detected: ${acceleratedDetected.map((signal) => signal.label).join(", ")}.`
          : "No Shop Pay, Apple Pay, Google Pay, or PayPal button was found in the rendered page.",
      evidence: signalEvidence(accelerated),
      whyItMatters:
        "Accelerated payment options can reduce typing for shoppers who already use them.",
      fixTracks: {
        storeOwner: [
          "Check Settings > Payments to confirm which accelerated methods are enabled.",
          "Confirm the theme's dynamic checkout button is enabled on the product template.",
        ],
        developer: {
          steps: [
            "Render the Shopify payment button only when the selected variant is available.",
            "Keep its label and branding consistent with Shopify requirements.",
          ],
        },
      },
    }),
  );

  return checks;
}

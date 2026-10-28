import { CRO_THRESHOLDS } from "@/lib/audit/thresholds";
import type {
  RenderedLocation,
  RenderedSignal,
  RenderedSignalGroup,
} from "@/lib/audit/types";
import type { RenderedSnapshot } from "@/lib/audit/render/extract";

/**
 * Marker selectors are data so the rules can be extended without touching the
 * extraction script. A marker is only evidence that a matching element existed
 * in the rendered DOM; it is never proof of a business outcome.
 */
export const MARKER_SELECTORS: Record<string, string[]> = {
  trustBadge: [
    'img[alt*="secure" i]',
    'img[alt*="guarantee" i]',
    'img[alt*="trust" i]',
    'img[alt*="verified" i]',
    'img[src*="trust" i]',
    '[class*="trust-badge"]',
    '[class*="trustbadge"]',
  ],
  paymentIcon: [
    'img[alt*="visa" i]',
    'img[alt*="mastercard" i]',
    'img[alt*="amex" i]',
    'img[alt*="american express" i]',
    'img[alt*="paypal" i]',
    'img[alt*="apple pay" i]',
    'img[alt*="google pay" i]',
    'img[alt*="shop pay" i]',
    '[class*="payment-icon"]',
    '[class*="payment-icons"]',
  ],
  secureBadge: [
    '[class*="secure-checkout"]',
    '[class*="secure_checkout"]',
    '[aria-label*="secure" i]',
  ],
  returnsLink: [
    'a[href*="return" i]',
    'a[href*="refund" i]',
    'a[href*="exchange" i]',
  ],
  shippingLink: [
    'a[href*="shipping" i]',
    'a[href*="delivery" i]',
  ],
  reviewWidget: [
    '[class*="jdgm"]',
    '[id*="judgeme"]',
    'script[src*="judge.me"]',
    '[class*="loox"]',
    '[class*="okendo"]',
    '[class*="yotpo"]',
    '[class*="stamped"]',
    '[class*="ruk_"]',
    '[class*="reviewsio"]',
    'script[src*="reviews.io"]',
    '#shopify-product-reviews',
    '.spr-container',
    '[class*="review-star"]',
    '[class*="rating"]',
  ],
  reviewStars: [
    '[class*="star-rating"]',
    '[class*="stars"]',
    '[aria-label*="star" i]',
    '[aria-label*="rating" i]',
  ],
  photoReview: [
    '[class*="photo-review"]',
    '[class*="review-photo"]',
    '[class*="customer-photo"]',
  ],
  bundleWidget: [
    '[class*="bundle"]',
    '[data-bundle]',
    '[class*="buy-more"]',
  ],
  upsellWidget: [
    '[class*="upsell"]',
    '[class*="cross-sell"]',
    '[class*="crosssell"]',
    '[class*="you-may-also"]',
    '[class*="frequently-bought"]',
    '[class*="complete-the-look"]',
  ],
  countdownWidget: [
    '[class*="countdown"]',
    '[data-countdown]',
    '[class*="timer"]',
    '[id*="countdown"]',
  ],
  faqWidget: [
    '[class*="faq"]',
    '[id*="faq"]',
    'details',
  ],
  sizeGuideLink: [
    'a[href*="size-guide" i]',
    'a[href*="size-chart" i]',
    '[class*="size-guide"]',
    '[class*="size-chart"]',
  ],
  chatWidget: [
    'script[src*="tidio"]',
    'script[src*="tawk"]',
    'script[src*="intercom"]',
    'script[src*="gorgias"]',
    'script[src*="zendesk"]',
    'script[src*="crisp"]',
    'script[src*="drift"]',
    'script[src*="livechat"]',
    'script[src*="chatra"]',
    '[id*="tidio"]',
    '[class*="intercom"]',
    '[id*="gorgias"]',
  ],
  whatsappLink: [
    'a[href*="wa.me"]',
    'a[href*="whatsapp"]',
  ],
  emailLink: ['a[href^="mailto:"]'],
  phoneLink: ['a[href^="tel:"]'],
  contactLink: ['a[href*="contact" i]'],
  shopPay: [
    '[class*="shop-pay"]',
    '[class*="shopify-payment-button"]',
    'button[aria-label*="Shop Pay" i]',
  ],
  applePay: ['button[aria-label*="Apple Pay" i]', '[class*="apple-pay"]'],
  googlePay: ['button[aria-label*="Google Pay" i]', '[class*="google-pay"]'],
  paypal: ['[class*="paypal"]', 'button[aria-label*="PayPal" i]'],
  ingredients: [
    '[class*="ingredient"]',
    '[class*="specification"]',
    '[class*="specs"]',
  ],
  comparison: [
    '[class*="comparison"]',
    '[class*="compare-table"]',
  ],
  beforeAfter: [
    '[class*="before-after"]',
    '[class*="beforeafter"]',
  ],
  brandStory: [
    '[class*="about-us"]',
    '[class*="our-story"]',
    '[class*="brand-story"]',
  ],
};

export type SignalRule = {
  id: string;
  group: RenderedSignalGroup;
  label: string;
  patterns?: RegExp[];
  markers?: string[];
  metric?: (snapshot: RenderedSnapshot) => {
    detected: boolean;
    evidence: string;
    location: RenderedLocation;
  };
};

const text = (patterns: RegExp[], snapshot: RenderedSnapshot) => {
  const regions: Array<[RenderedLocation, string]> = [
    ["near-buy-box", snapshot.texts.nearBuyBox],
    ["above-fold", snapshot.texts.aboveFold],
    ["below-fold", snapshot.texts.belowFold],
    ["footer-only", snapshot.texts.footer],
    ["page-wide", snapshot.texts.pageWide],
  ];

  for (const [location, content] of regions) {
    if (!content) continue;
    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (!match) continue;

      // Keep the snippet on word boundaries so evidence reads as a phrase
      // instead of starting or ending mid-word.
      let start = Math.max(0, match.index - 35);
      if (start > 0) {
        const nextSpace = content.indexOf(" ", start);
        if (nextSpace !== -1 && nextSpace < match.index) start = nextSpace + 1;
      }

      let end = Math.min(content.length, match.index + match[0].length + 45);
      if (end < content.length) {
        const lastSpace = content.lastIndexOf(" ", end);
        if (lastSpace > match.index + match[0].length) end = lastSpace;
      }

      const snippet = content.slice(start, end).trim();
      const lead = start > 0 ? "…" : "";
      const trail = end < content.length ? "…" : "";
      return {
        location,
        evidence: `${lead}“${snippet}”${trail}`,
      };
    }
  }

  return null;
};

const marker = (ids: string[], snapshot: RenderedSnapshot) => {
  for (const id of ids) {
    const found = snapshot.markers.find((entry) => entry.id === id);
    if (found) return found;
  }
  return null;
};

const locationLabel: Record<RenderedLocation, string> = {
  "above-fold": "above the fold",
  "near-buy-box": "near the buy box",
  "below-fold": "below the fold",
  "footer-only": "footer only",
  "page-wide": "page-wide / app script",
  "not-found": "not found",
};

export function locationText(location: RenderedLocation) {
  return locationLabel[location];
}

const rules: SignalRule[] = [
  // Trust and guarantees
  {
    id: "money-back-guarantee",
    group: "trust",
    label: "Money-back or satisfaction guarantee",
    patterns: [
      /\b(money[-\s]?back|satisfaction guarantee|\d+[-\s]day guarantee|guaranteed returns?)\b/i,
    ],
  },
  {
    id: "secure-checkout",
    group: "trust",
    label: "Secure checkout wording",
    patterns: [/\b(secure checkout|safe checkout|secure payment|ssl encrypted|256-bit)\b/i],
    markers: ["secureBadge"],
  },
  {
    id: "trust-badges",
    group: "trust",
    label: "Trust badge images or labels",
    markers: ["trustBadge"],
    patterns: [/\b(verified by|trusted by|as seen in|secure & trusted)\b/i],
  },
  {
    id: "payment-icons",
    group: "trust",
    label: "Payment method icons",
    markers: ["paymentIcon"],
    patterns: [/\b(visa|mastercard|american express|amex|paypal|apple pay|google pay|shop pay)\b/i],
  },
  {
    id: "privacy-security",
    group: "trust",
    label: "Privacy or security wording",
    patterns: [/\b(privacy policy|your data is (safe|protected)|encrypted checkout)\b/i],
  },

  // Shipping and returns
  {
    id: "free-shipping",
    group: "shipping-returns",
    label: "Free shipping message",
    patterns: [/\b(free shipping|free delivery|free standard shipping|ships free)\b/i],
  },
  {
    id: "delivery-estimate",
    group: "shipping-returns",
    label: "Delivery estimate",
    patterns: [
      /\b(delivered by|arrives by|estimated delivery|delivery estimate|order (today|within).{0,40}(receive|arrive)|ships within)\b/i,
    ],
  },
  {
    id: "returns-refunds",
    group: "shipping-returns",
    label: "Returns or refunds policy",
    patterns: [
      /\breturns?\s+(?:policy|policies|window|period|and|or)\b/i,
      /\b(?:refunds?|exchanges?)\b/i,
      /\breturns\b/i,
    ],
    markers: ["returnsLink"],
  },
  {
    id: "shipping-link",
    group: "shipping-returns",
    label: "Shipping information link",
    markers: ["shippingLink"],
  },

  // Social proof
  {
    id: "review-stars",
    group: "social-proof",
    label: "Review stars or rating",
    patterns: [/\b\d+(\.\d+)?\s*(out of\s*5|\/\s*5|stars?)\b/i, /\b\d[\d,]*\s+(reviews?|ratings?)\b/i],
    markers: ["reviewStars", "reviewWidget"],
  },
  {
    id: "review-app",
    group: "social-proof",
    label: "Known review app or widget",
    markers: ["reviewWidget"],
  },
  {
    id: "photo-reviews",
    group: "social-proof",
    label: "Customer photo reviews",
    patterns: [/\b(photo reviews?|customer photos?|real results|before and after)\b/i],
    markers: ["photoReview"],
  },
  {
    id: "sold-count",
    group: "social-proof",
    label: "Visible sold or customer count",
    patterns: [/\b\d[\d,.]*k?\+?\s*(sold|purchases|customers|orders)\b/i],
  },

  // Offers and pricing
  {
    id: "discount-message",
    group: "offers",
    label: "Discount or sale message",
    patterns: [/\b(save\s?(?:\$|£|€|₹)?\s?\d+|\d+\s?%\s?off|on sale|clearance|discount)\b/i],
    metric: (snapshot) =>
      snapshot.discountBadgeDetected
        ? {
            detected: true,
            evidence: snapshot.discountBadgeText
              ? `Near the buy box: “${snapshot.discountBadgeText}”`
              : "A discount badge was measured near the buy box.",
            location: "near-buy-box",
          }
        : { detected: false, evidence: "", location: "not-found" },
  },
  {
    id: "bundles",
    group: "offers",
    label: "Bundle or buy-X-get-Y offer",
    patterns: [/\b(bundle|buy \d+ get \d+|save .{0,30} when you buy|value pack)\b/i],
    markers: ["bundleWidget"],
  },
  {
    id: "subscribe-save",
    group: "offers",
    label: "Subscribe-and-save option",
    patterns: [/\b(subscribe (and|&) save|subscription|auto[-\s]?ship|deliver every)\b/i],
  },
  {
    id: "free-gift",
    group: "offers",
    label: "Free gift offer",
    patterns: [/\b(free gift|gift with purchase|includes a free)\b/i],
  },
  {
    id: "quantity-breaks",
    group: "offers",
    label: "Quantity break or volume discount",
    patterns: [/\b(quantity discount|buy more.{0,20}save|volume discount|\d+ for\s?(?:\$|£|€)\s?\d+)\b/i],
  },
  {
    id: "upsell-cross-sell",
    group: "offers",
    label: "Upsell or cross-sell section",
    patterns: [/\b(you may also like|frequently bought together|complete the (set|look)|pairs well with)\b/i],
    markers: ["upsellWidget"],
  },

  // Urgency and scarcity
  {
    id: "countdown-timer",
    group: "urgency",
    label: "Countdown timer or deadline",
    patterns: [/\b(ends in|offer ends|sale ends|hurry|limited time)\b/i],
    markers: ["countdownWidget"],
  },
  {
    id: "low-stock",
    group: "urgency",
    label: "Low-stock message",
    patterns: [/\b(only \d+ left|low stock|almost (sold out|gone)|selling fast|last chance)\b/i],
  },

  // Product content
  {
    id: "description-depth",
    group: "product-content",
    label: "Description of at least 400 characters",
    metric: (snapshot) => ({
      detected:
        snapshot.descriptionTextLength >= CRO_THRESHOLDS.descriptionMinChars,
      evidence:
        snapshot.descriptionTextLength > 0
          ? `${snapshot.descriptionTextLength} characters of description text measured.`
          : "No product description container was found.",
      location:
        snapshot.descriptionTextLength > 0 ? "near-buy-box" : "not-found",
    }),
  },
  {
    id: "bullets",
    group: "product-content",
    label: "Bulleted benefits or specs",
    metric: (snapshot) => ({
      detected: snapshot.descriptionBulletCount >= 3,
      evidence: `${snapshot.descriptionBulletCount} list item${
        snapshot.descriptionBulletCount === 1 ? "" : "s"
      } found in the description.`,
      location: snapshot.descriptionBulletCount > 0 ? "near-buy-box" : "not-found",
    }),
  },
  {
    id: "faq",
    group: "product-content",
    label: "FAQ or accordion",
    patterns: [/\b(faq|frequently asked|questions & answers|q&a)\b/i],
    markers: ["faqWidget"],
  },
  {
    id: "size-guide",
    group: "product-content",
    label: "Size guide or chart",
    patterns: [/\b(size guide|size chart|sizing guide|fit guide)\b/i],
    markers: ["sizeGuideLink"],
  },
  {
    id: "ingredients-specs",
    group: "product-content",
    label: "Ingredients, materials, or specifications",
    patterns: [/\b(ingredients?|materials?|specifications?|dimensions|care instructions)\b/i],
    markers: ["ingredients"],
  },
  {
    id: "comparison",
    group: "product-content",
    label: "Comparison content",
    patterns: [/\b(compare|comparison|versus|\bvs\.?\b|why choose)\b/i],
    markers: ["comparison"],
  },
  {
    id: "product-video",
    group: "product-content",
    label: "Product video",
    metric: (snapshot) => ({
      detected: snapshot.videoDetected,
      evidence: snapshot.videoDetected
        ? "A video or video embed is present in the rendered page."
        : "No video element or YouTube/Vimeo embed was found.",
      location: snapshot.videoDetected ? "below-fold" : "not-found",
    }),
  },
  {
    id: "before-after",
    group: "product-content",
    label: "Before/after or results content",
    patterns: [/\b(before (and|&) after|before\/after|real results|results after)\b/i],
    markers: ["beforeAfter"],
  },
  {
    id: "brand-story",
    group: "product-content",
    label: "Brand or about text",
    patterns: [/\b(about us|our story|our mission|made in|family[-\s]owned)\b/i],
    markers: ["brandStory"],
  },

  // Support
  {
    id: "chat-widget",
    group: "support",
    label: "Live chat or support widget",
    patterns: [/\b(live chat|chat with us|message us)\b/i],
    markers: ["chatWidget"],
  },
  {
    id: "whatsapp",
    group: "support",
    label: "WhatsApp contact",
    markers: ["whatsappLink"],
  },
  {
    id: "email-contact",
    group: "support",
    label: "Visible email contact",
    markers: ["emailLink"],
  },
  {
    id: "phone-contact",
    group: "support",
    label: "Visible phone contact",
    markers: ["phoneLink"],
  },
  {
    id: "contact-page",
    group: "support",
    label: "Contact page link",
    markers: ["contactLink"],
  },

  // Accelerated checkout
  {
    id: "shop-pay",
    group: "accelerated-checkout",
    label: "Shop Pay",
    patterns: [/\bshop pay\b/i],
    markers: ["shopPay"],
  },
  {
    id: "apple-pay",
    group: "accelerated-checkout",
    label: "Apple Pay",
    patterns: [/\bapple pay\b/i],
    markers: ["applePay"],
  },
  {
    id: "google-pay",
    group: "accelerated-checkout",
    label: "Google Pay",
    patterns: [/\bgoogle pay\b/i],
    markers: ["googlePay"],
  },
  {
    id: "paypal",
    group: "accelerated-checkout",
    label: "PayPal",
    patterns: [/\bpaypal\b/i],
    markers: ["paypal"],
  },
];

export const SIGNAL_RULES: ReadonlyArray<SignalRule> = rules;

export function detectSignals(snapshot: RenderedSnapshot): RenderedSignal[] {
  return SIGNAL_RULES.map((rule) => {
    const metric = rule.metric?.(snapshot);
    if (metric?.detected) {
      return {
        id: rule.id,
        group: rule.group,
        label: rule.label,
        status: "detected",
        evidence: metric.evidence,
        location: metric.location,
      };
    }

    const foundMarker = rule.markers
      ? marker(rule.markers, snapshot)
      : null;

    const foundText = rule.patterns
      ? text(rule.patterns, snapshot)
      : null;

    if (foundText) {
      return {
        id: rule.id,
        group: rule.group,
        label: rule.label,
        status: "detected",
        evidence: foundText.evidence,
        location: foundText.location,
      };
    }

    if (foundMarker) {
      return {
        id: rule.id,
        group: rule.group,
        label: rule.label,
        status: "detected",
        evidence: `Matched ${foundMarker.evidence || "a known element"}.`,
        location: foundMarker.location,
      };
    }

    return {
      id: rule.id,
      group: rule.group,
      label: rule.label,
      status: "not-detected",
      evidence: "Not found in the rendered page.",
      location: "not-found",
    };
  });
}

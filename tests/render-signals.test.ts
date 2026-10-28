import { describe, expect, it } from "vitest";
import { detectSignals } from "@/lib/audit/render/signals";
import { snapshot } from "./fixtures/rendered-snapshot";

function signal(
  signals: ReturnType<typeof detectSignals>,
  id: string,
) {
  const found = signals.find((entry) => entry.id === id);
  if (!found) throw new Error(`Expected signal ${id}`);
  return found;
}

describe("rendered ecommerce signal detection", () => {
  it("detects trust, payment, and secure-checkout signals with location", () => {
    const signals = detectSignals(
      snapshot({
        texts: {
          aboveFold: "",
          nearBuyBox: "30-day money-back guarantee. Secure checkout.",
          belowFold: "",
          footer: "",
          pageWide: "",
        },
        markers: [
          {
            id: "paymentIcon",
            evidence: "Visa",
            location: "near-buy-box",
          },
        ],
      }),
    );

    expect(signal(signals, "money-back-guarantee")).toMatchObject({
      status: "detected",
      location: "near-buy-box",
    });
    expect(signal(signals, "money-back-guarantee").evidence).toContain(
      "money-back",
    );
    expect(signal(signals, "secure-checkout").status).toBe("detected");
    expect(signal(signals, "payment-icons")).toMatchObject({
      status: "detected",
      location: "near-buy-box",
    });
    expect(signal(signals, "payment-icons").evidence).toContain("Visa");
  });

  it("detects shipping and returns near the buy box and footer-only elsewhere", () => {
    const signals = detectSignals(
      snapshot({
        texts: {
          aboveFold: "",
          nearBuyBox: "Free shipping on orders over $50. Easy returns.",
          belowFold: "",
          footer: "",
          pageWide: "",
        },
      }),
    );

    expect(signal(signals, "free-shipping")).toMatchObject({
      status: "detected",
      location: "near-buy-box",
    });
    expect(signal(signals, "returns-refunds").status).toBe("detected");

    const footerOnly = detectSignals(
      snapshot({
        texts: {
          aboveFold: "",
          nearBuyBox: "",
          belowFold: "",
          footer: "Shipping and returns policy",
          pageWide: "",
        },
      }),
    );
    expect(signal(footerOnly, "shipping-link").status).toBe("not-detected");
    expect(signal(footerOnly, "returns-refunds")).toMatchObject({
      status: "detected",
      location: "footer-only",
    });
  });

  it("detects review apps, stars, and social proof", () => {
    const signals = detectSignals(
      snapshot({
        texts: {
          aboveFold: "",
          nearBuyBox: "4.8 out of 5 from 1,234 reviews",
          belowFold: "",
          footer: "",
          pageWide: "",
        },
        markers: [
          {
            id: "reviewWidget",
            evidence: "jdgm-widget",
            location: "below-fold",
          },
        ],
      }),
    );

    expect(signal(signals, "review-stars").status).toBe("detected");
    expect(signal(signals, "review-app")).toMatchObject({
      status: "detected",
      location: "below-fold",
    });
  });

  it("detects offers, bundles, upsells, and urgency", () => {
    const signals = detectSignals(
      snapshot({
        texts: {
          aboveFold: "",
          nearBuyBox:
            "Save 20% today. Bundle and save. Subscribe and save 10%. Only 3 left.",
          belowFold: "You may also like",
          footer: "",
          pageWide: "",
        },
        discountBadgeDetected: true,
        discountBadgeText: "20% off",
        markers: [
          {
            id: "countdownWidget",
            evidence: "countdown-timer",
            location: "near-buy-box",
          },
        ],
      }),
    );

    expect(signal(signals, "discount-message")).toMatchObject({
      status: "detected",
      location: "near-buy-box",
    });
    expect(signal(signals, "bundles").status).toBe("detected");
    expect(signal(signals, "subscribe-save").status).toBe("detected");
    expect(signal(signals, "low-stock")).toMatchObject({
      status: "detected",
      location: "near-buy-box",
    });
    expect(signal(signals, "countdown-timer").status).toBe("detected");
    expect(signal(signals, "upsell-cross-sell").status).toBe("detected");
  });

  it("detects product content, support, and accelerated checkout", () => {
    const signals = detectSignals(
      snapshot({
        texts: {
          aboveFold: "",
          nearBuyBox: "FAQ. Size guide. Ingredients.",
          belowFold: "",
          footer: "",
          pageWide: "",
        },
        markers: [
          {
            id: "sizeGuideLink",
            evidence: "Size guide",
            location: "near-buy-box",
          },
          {
            id: "chatWidget",
            evidence: "tidio",
            location: "page-wide",
          },
          {
            id: "shopPay",
            evidence: "Shop Pay",
            location: "near-buy-box",
          },
        ],
      }),
    );

    expect(signal(signals, "description-depth").status).toBe("detected");
    expect(signal(signals, "bullets").status).toBe("detected");
    expect(signal(signals, "faq").status).toBe("detected");
    expect(signal(signals, "size-guide").status).toBe("detected");
    expect(signal(signals, "ingredients-specs").status).toBe("detected");
    expect(signal(signals, "chat-widget")).toMatchObject({
      status: "detected",
      location: "page-wide",
    });
    expect(signal(signals, "shop-pay")).toMatchObject({
      status: "detected",
      location: "near-buy-box",
    });
  });

  it("does not treat ordinary product copy as a returns policy", () => {
    const signals = detectSignals(
      snapshot({
        texts: {
          aboveFold: "",
          nearBuyBox: "Soft cushioning with responsive energy return.",
          belowFold: "",
          footer: "",
          pageWide: "",
        },
      }),
    );

    expect(signal(signals, "returns-refunds").status).toBe("not-detected");
  });

  it("keeps quoted evidence on word boundaries", () => {
    const signals = detectSignals(
      snapshot({
        texts: {
          aboveFold: "",
          nearBuyBox:
            "A long sentence about cushioning and comfort before the useful part. Free returns within 30 days of delivery. More copy follows here.",
          belowFold: "",
          footer: "",
          pageWide: "",
        },
      }),
    );

    const evidence = signal(signals, "returns-refunds").evidence;
    expect(evidence).toContain("returns");
    expect(evidence.startsWith("…“") || evidence.startsWith("“")).toBe(true);
    expect(evidence.includes("  ")).toBe(false);
  });

  it('uses "not found in the rendered page" wording, never "does not exist"', () => {
    const signals = detectSignals(snapshot());

    const missing = signal(signals, "low-stock");
    expect(missing.status).toBe("not-detected");
    expect(missing.evidence).toBe("Not found in the rendered page.");
    expect(missing.evidence.toLowerCase()).not.toContain("does not exist");
    expect(missing.location).toBe("not-found");
  });

  it("is heuristic and can miss signals hidden in cross-origin iframes", () => {
    const signals = detectSignals(
      snapshot({
        texts: {
          aboveFold: "",
          nearBuyBox: "",
          belowFold: "",
          footer: "",
          pageWide: "",
        },
      }),
    );

    expect(signal(signals, "review-app").status).toBe("not-detected");
    expect(signal(signals, "money-back-guarantee").status).toBe("not-detected");
  });
});

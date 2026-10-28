import { describe, expect, it } from "vitest";
import { buildRenderedChecks } from "@/lib/audit/render/checks";
import { detectSignals } from "@/lib/audit/render/signals";
import { applyFixPlan, priorityFor, effortFor } from "@/lib/audit/fix-plan";
import type { AuditCheck } from "@/lib/audit/types";
import { snapshot } from "./fixtures/rendered-snapshot";

function build(overrides: Parameters<typeof snapshot>[0] = {}) {
  const value = snapshot(overrides);
  return buildRenderedChecks(value, detectSignals(value));
}

function check(checks: AuditCheck[], id: string) {
  const found = checks.find((entry) => entry.id === id);
  if (!found) throw new Error(`Expected check ${id}`);
  return found;
}

describe("rendered above-the-fold checks", () => {
  it("passes when title, price, and add-to-cart are inside the first screen", () => {
    const aboveFold = check(build(), "render-above-fold");

    expect(aboveFold.status).toBe("pass");
    expect(aboveFold.evidence.join(" ")).toContain("Title: top 120px");
    expect(aboveFold.evidence.join(" ")).toContain("Add to cart: top 220px");
  });

  it("fails when the add-to-cart or price starts below the first screen", () => {
    const belowFold = check(
      build({
        priceRect: { x: 16, y: 900, width: 120, height: 28 },
        addToCartRect: { x: 16, y: 950, width: 358, height: 52 },
        addToCartAboveFold: false,
      }),
      "render-above-fold",
    );

    expect(belowFold.status).toBe("fail");
    expect(belowFold.severity).toBe("high");
    expect(belowFold.evidence.join(" ")).toContain("below the 844px first screen");
  });

  it("warns when the purchase action is visible but the title is not", () => {
    const titleBelow = check(
      build({
        titleRect: { x: 16, y: 880, width: 358, height: 40 },
      }),
      "render-above-fold",
    );

    expect(titleBelow.status).toBe("warning");
  });

  it("fails clearly when no add-to-cart control was found", () => {
    const missing = check(
      build({ addToCartRect: null, addToCartLabel: null }),
      "render-above-fold",
    );

    expect(missing.status).toBe("fail");
    expect(missing.summary).toContain("No add-to-cart control");
  });
});

describe("rendered tap-target checks", () => {
  it("fails a button smaller than 44 by 44 pixels", () => {
    const small = check(
      build({
        addToCartRect: { x: 16, y: 220, width: 40, height: 40 },
      }),
      "render-buy-button",
    );

    expect(small.status).toBe("fail");
    expect(small.severity).toBe("medium");
    expect(small.summary).toContain("40 × 40px");
    expect(small.evidence.join(" ")).toContain("at least 44 × 44px");
  });

  it("passes a button exactly at the editorial minimum", () => {
    const minimum = check(
      build({
        addToCartRect: { x: 16, y: 220, width: 44, height: 44 },
      }),
      "render-buy-button",
    );

    expect(minimum.status).toBe("pass");
  });

  it("marks the size unverified when no button exists", () => {
    const missing = check(
      build({ addToCartRect: null, addToCartLabel: null }),
      "render-buy-button",
    );

    expect(missing.status).toBe("not-checked");
  });
});

describe("rendered measurable CRO checks", () => {
  it("warns when fewer than four product images are rendered", () => {
    const images = check(
      build({ productImageCount: 2, productImagesWithAlt: 1 }),
      "render-product-images",
    );

    expect(images.status).toBe("warning");
    expect(images.evidence.join(" ")).toContain("Images measured: 2");
    expect(images.evidence.join(" ")).toContain("at least 4 distinct images");
  });

  it("reports sticky add-to-cart, variants, overflow, and overlays", () => {
    const checks = build({
      stickyAddToCartDetected: true,
      stickyAddToCartLabel: "Add to cart",
      variantSelectorDetected: true,
      variantPreselected: false,
      horizontalOverflow: true,
      scrollWidth: 420,
      overlayCoverage: 0.42,
      overlayText: "Get 10% off",
    });

    expect(check(checks, "render-sticky-atc").status).toBe("pass");
    expect(check(checks, "render-variants").status).toBe("warning");
    expect(check(checks, "render-overflow")).toMatchObject({
      status: "fail",
      severity: "high",
    });
    expect(check(checks, "render-overflow").summary).toContain("420px vs 390px");
    expect(check(checks, "render-overlay")).toMatchObject({
      status: "warning",
      severity: "medium",
    });
    expect(check(checks, "render-overlay").summary).toContain("42%");
  });

  it("passes a clean overlay and no horizontal overflow", () => {
    const checks = build();

    expect(check(checks, "render-overflow").status).toBe("pass");
    expect(check(checks, "render-overlay").status).toBe("pass");
  });

  it("reports a visible price, compare-at context, and discount badge honestly", () => {
    const checks = build({
      compareAtText: "$150.00",
      discountBadgeDetected: true,
      discountBadgeText: "Save 15%",
    });
    const price = check(checks, "render-price");

    expect(price.status).toBe("pass");
    expect(price.evidence.join(" ")).toContain("Compare-at text: $150.00");
    expect(price.evidence.join(" ")).toContain("Discount badge: Save 15%");
  });

  it("keeps trust, shipping, social, content, and support checks honest", () => {
    const checks = build();

    expect(check(checks, "render-trust").status).toBe("warning");
    expect(check(checks, "render-shipping-returns").status).toBe("warning");
    expect(check(checks, "render-social-proof").status).toBe("warning");
    expect(check(checks, "render-product-content").status).toBe("warning");
    expect(check(checks, "render-product-content").summary).toContain(
      "2 of 9 product-content signals",
    );
    expect(check(checks, "render-support").status).toBe("pass");
    expect(check(checks, "render-support").summary).toContain(
      "No chat, WhatsApp, email, phone, or contact link",
    );
    expect(
      check(checks, "render-support").evidence.join(" ").toLowerCase(),
    ).toContain("not found in the rendered page");
  });
});

describe("rendered finding quality", () => {
  it("gives every finding why-it-matters and both fix tracks", () => {
    const checks = build();

    for (const entry of checks) {
      expect(entry.whyItMatters?.length, entry.id).toBeGreaterThan(20);
      expect(entry.fixTracks?.storeOwner.length, entry.id).toBeGreaterThan(0);
      expect(entry.fixTracks?.developer.steps.length, entry.id).toBeGreaterThan(
        0,
      );
      expect(entry.source).toBe("rendered");
    }
  });

  it("uses deterministic priority and effort without conversion claims", () => {
    const checks = build({
      addToCartRect: { x: 16, y: 220, width: 30, height: 30 },
      horizontalOverflow: true,
      scrollWidth: 420,
    });

    expect(priorityFor(check(checks, "render-buy-button"))).toBe("high");
    expect(priorityFor(check(checks, "render-overflow"))).toBe("high");
    expect(
      priorityFor(check(checks, "render-sticky-atc")),
    ).toBe("low");

    const planned = applyFixPlan(check(checks, "render-buy-button"));
    expect(planned.effort).toBe("easy");
    expect(planned.fixSteps?.length).toBeGreaterThan(0);
    expect(JSON.stringify(checks).toLowerCase()).not.toContain(
      "conversion rate",
    );
    expect(effortFor(check(checks, "render-above-fold"))).toBe("moderate");
  });
});

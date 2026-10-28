import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzePage } from "@/lib/audit/analyze";
import type { ProductData } from "@/lib/audit/product-json";
import type { AuditCheck } from "@/lib/audit/types";

function fixture(name: string) {
  return readFileSync(join(process.cwd(), "tests", "fixtures", name), "utf8");
}

function productData(overrides: Partial<ProductData> = {}): ProductData {
  return {
    title: "Trail Runner 2",
    handle: "trail-runner-2",
    productType: "Running shoes",
    tags: ["trail", "running"],
    descriptionLength: 180,
    descriptionPreview: "Lightweight trail running shoes.",
    images: [
      { alt: "Side view", position: 1 },
      { alt: null, position: 2 },
    ],
    options: [{ name: "Size", valueCount: 2 }],
    variants: [
      {
        title: "8",
        price: "128.00",
        compareAtPrice: "150.00",
        available: true,
        hasImage: true,
      },
      {
        title: "9",
        price: "128.00",
        compareAtPrice: null,
        available: false,
        hasImage: false,
      },
    ],
    ...overrides,
  };
}

function analyzeWithProductJson(productJson: Parameters<typeof analyzePage>[0]["productJson"]) {
  return analyzePage({
    html: fixture("product-page.html"),
    finalUrl: "https://northlinegear.com/products/trail-runner-2",
    httpStatus: 200,
    bytes: 0,
    xRobotsTag: "",
    productJson,
  });
}

function getCheck(checks: AuditCheck[], id: string) {
  const check = checks.find((candidate) => candidate.id === id);
  if (!check) throw new Error(`Expected check ${id}`);
  return check;
}

describe("analyzePage with Shopify product JSON", () => {
  it("adds real product checks and rule-based fix metadata", () => {
    const result = analyzeWithProductJson({
      status: "checked",
      data: productData(),
    });

    expect(result.checks).toHaveLength(21);
    expect(getCheck(result.checks, "product-images")).toMatchObject({
      status: "warning",
      category: "product",
      priority: "medium",
      effort: "easy",
    });
    expect(getCheck(result.checks, "product-pricing").status).toBe("pass");
    expect(getCheck(result.checks, "product-availability")).toMatchObject({
      status: "warning",
      severity: "low",
      priority: "low",
    });
    expect(getCheck(result.checks, "product-images").fixSteps?.length).toBeGreaterThan(0);
  });

  it("adds Unverified product checks when JSON is unavailable", () => {
    const reason =
      "Shopify returned HTTP 404 for the product JSON, so the store may have disabled it.";
    const result = analyzeWithProductJson({
      status: "unavailable",
      reason,
    });

    expect(result.checks).toHaveLength(21);
    const productChecks = result.checks.filter(
      (check) => check.category === "product" && check.id !== "product-page",
    );
    expect(productChecks).toHaveLength(7);
    expect(
      productChecks.every(
        (check) =>
          check.status === "not-checked" &&
          check.severity === "unknown" &&
          check.evidence.includes(reason),
      ),
    ).toBe(true);
  });
});

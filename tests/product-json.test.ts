import { describe, expect, it } from "vitest";
import { AuditScanError } from "@/lib/audit/errors";
import {
  fetchPublicJson,
  type JsonRequest,
  type JsonResponse,
} from "@/lib/audit/fetch-page";
import {
  buildProductChecks,
  buildProductJsonUrl,
  extractProductHandle,
  parseProductJson,
  parseProductJsonResult,
  productJsonFailureReason,
  type ProductData,
} from "@/lib/audit/product-json";

function productJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    product: {
      id: 1,
      handle: "trail-runner-2",
      title: "Trail Runner 2",
      body_html:
        "<p>Lightweight trail running shoes with a grippy outsole and a breathable mesh upper. Designed for long runs on mixed terrain.</p>",
      product_type: "Running shoes",
      tags: ["trail", "running"],
      images: [
        { id: 1, position: 1, alt: "Side view of the Trail Runner 2" },
        { id: 2, position: 2, alt: null },
      ],
      options: [{ name: "Size", position: 1, values: ["8", "9"] }],
      variants: [
        {
          id: 11,
          title: "8",
          price: "128.00",
          compare_at_price: "150.00",
          available: true,
          featured_image: { id: 1 },
        },
        {
          id: 12,
          title: "9",
          price: "128.00",
          compare_at_price: null,
          available: false,
          featured_image: null,
        },
      ],
      ...overrides,
    },
  });
}

function imageResponse(overrides: Partial<JsonResponse> = {}): JsonResponse {
  return {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
    text: productJson(),
    bytes: 100,
    redirectTo: null,
    ...overrides,
  };
}

function checkedData(overrides: Partial<ProductData> = {}): ProductData {
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

function getCheck(checks: ReturnType<typeof buildProductChecks>, id: string) {
  const check = checks.find((candidate) => candidate.id === id);
  if (!check) throw new Error(`Expected check ${id}`);
  return check;
}

describe("product JSON URL detection", () => {
  it("finds a handle only for a real /products/<handle> URL", () => {
    expect(
      extractProductHandle("https://store.com/products/trail-runner-2"),
    ).toBe("trail-runner-2");
    expect(
      extractProductHandle(
        "https://store.com/en/products/trail-runner-2?utm_source=test",
      ),
    ).toBe("trail-runner-2");
    expect(extractProductHandle("https://store.com/collections/all")).toBeNull();
    expect(
      extractProductHandle("https://store.com/products/trail-runner-2/reviews"),
    ).toBeNull();
  });

  it("builds the product JSON URL from the final origin", () => {
    expect(
      buildProductJsonUrl(
        "https://store.com/en/products/trail-runner-2",
        "trail-runner-2",
      ),
    ).toBe("https://store.com/products/trail-runner-2.json");
  });
});

describe("parseProductJson", () => {
  it("reads the real fields without inventing missing values", () => {
    const parsed = parseProductJson(productJson(), "trail-runner-2");

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.data.title).toBe("Trail Runner 2");
    expect(parsed.data.productType).toBe("Running shoes");
    expect(parsed.data.tags).toEqual(["trail", "running"]);
    expect(parsed.data.images).toHaveLength(2);
    expect(parsed.data.images[1].alt).toBeNull();
    expect(parsed.data.options).toEqual([{ name: "Size", valueCount: 2 }]);
    expect(parsed.data.variants).toHaveLength(2);
    expect(parsed.data.variants[0]).toMatchObject({
      price: "128.00",
      compareAtPrice: "150.00",
      available: true,
      hasImage: true,
    });
    expect(parsed.data.variants[1]).toMatchObject({
      price: "128.00",
      compareAtPrice: null,
      available: false,
      hasImage: false,
    });
    expect(parsed.data.descriptionLength).toBeGreaterThan(100);
  });

  it("rejects a product that does not match the requested handle", () => {
    const parsed = parseProductJson(productJson(), "another-product");
    expect(parsed).toMatchObject({
      ok: false,
      reason: "The product JSON did not match the requested product.",
    });
  });

  it("rejects malformed JSON and unusable shapes", () => {
    expect(parseProductJson("{not json")).toMatchObject({
      ok: false,
      reason: "The store returned a response that was not valid JSON.",
    });
    expect(parseProductJson(JSON.stringify({ product: null }))).toMatchObject({
      ok: false,
    });
    expect(parseProductJson(JSON.stringify({ product: {} }))).toMatchObject({
      ok: false,
      reason: "The product JSON did not contain usable product fields.",
    });
  });

  it("rejects product JSON above the safe size limit", () => {
    expect(parseProductJson("x".repeat(1024 * 1024 + 1))).toMatchObject({
      ok: false,
      reason: "The product JSON response was too large to read safely.",
    });
  });
});

describe("buildProductChecks with real product data", () => {
  const checks = buildProductChecks({
    status: "checked",
    data: checkedData(),
  });

  it("reports image count and missing alt text with evidence", () => {
    const check = getCheck(checks, "product-images");
    expect(check.status).toBe("warning");
    expect(check.severity).toBe("medium");
    expect(check.evidence.join(" ")).toContain("Product JSON images: 2");
    expect(check.evidence.join(" ")).toContain("Images without alt text: 1");
  });

  it("reports variants, options, variant images, and prices", () => {
    expect(getCheck(checks, "product-variants").status).toBe("pass");
    expect(getCheck(checks, "product-variant-images").status).toBe("pass");
    expect(getCheck(checks, "product-pricing").status).toBe("pass");
    expect(getCheck(checks, "product-pricing").evidence.join(" ")).toContain(
      "Compare-at price present: 1 of 2 variants",
    );
  });

  it("reports description, taxonomy, and availability facts", () => {
    expect(getCheck(checks, "product-description").status).toBe("pass");
    expect(getCheck(checks, "product-taxonomy").status).toBe("pass");
    const availability = getCheck(checks, "product-availability");
    expect(availability.status).toBe("warning");
    expect(availability.severity).toBe("low");
    expect(availability.evidence.join(" ")).toContain(
      "Available variants: 1 of 2",
    );
  });

  it("warns about an empty or very short description", () => {
    const empty = getCheck(
      buildProductChecks({
        status: "checked",
        data: checkedData({ descriptionLength: 0 }),
      }),
      "product-description",
    );
    expect(empty).toMatchObject({ status: "warning", severity: "medium" });

    const short = getCheck(
      buildProductChecks({
        status: "checked",
        data: checkedData({ descriptionLength: 40 }),
      }),
      "product-description",
    );
    expect(short).toMatchObject({ status: "warning", severity: "low" });
  });

  it("marks checks that need variants as unverified when there are none", () => {
    const noVariants = buildProductChecks({
      status: "checked",
      data: checkedData({ variants: [] }),
    });

    expect(getCheck(noVariants, "product-variants")).toMatchObject({
      status: "warning",
      severity: "medium",
    });
    expect(getCheck(noVariants, "product-variant-images").status).toBe(
      "not-checked",
    );
    expect(getCheck(noVariants, "product-pricing").status).toBe("not-checked");
    expect(getCheck(noVariants, "product-availability").status).toBe(
      "not-checked",
    );
  });

  it("warns when no variant has an assigned image", () => {
    const noVariantImages = buildProductChecks({
      status: "checked",
      data: checkedData({
        variants: checkedData().variants.map((variant) => ({
          ...variant,
          hasImage: false,
        })),
      }),
    });

    expect(getCheck(noVariantImages, "product-variant-images")).toMatchObject({
      status: "warning",
      severity: "low",
    });
  });
});

describe("unverified product checks", () => {
  it("returns honest Unverified checks for a 404 or blocked JSON response", () => {
    const reason =
      "Shopify returned HTTP 404 for the product JSON, so the store may have disabled it.";
    const checks = buildProductChecks({ status: "unavailable", reason });

    expect(checks).toHaveLength(7);
    expect(checks.every((check) => check.status === "not-checked")).toBe(true);
    expect(checks.every((check) => check.severity === "unknown")).toBe(true);
    expect(checks.every((check) => check.evidence.includes(reason))).toBe(true);
  });

  it("maps fetch failures to safe reasons without hostnames or raw messages", () => {
    const error = new AuditScanError(
      "HTTP_ERROR",
      "secret.internal.example returned a raw error",
      422,
      404,
    );
    const reason = productJsonFailureReason(error);

    expect(reason).toContain("HTTP 404");
    expect(reason).not.toContain("secret.internal.example");
  });

  it("treats a non-JSON response as Unverified", () => {
    const result = parseProductJsonResult("<!doctype html><html></html>");
    expect(result).toMatchObject({
      status: "unavailable",
      reason: "The store returned a response that was not valid JSON.",
    });
  });
});

describe("fetchPublicJson", () => {
  it("uses the same redirect follower as the HTML fetch", async () => {
    const seen: string[] = [];
    const request: JsonRequest = async (url) => {
      seen.push(url.toString());
      if (url.pathname === "/start") {
        return imageResponse({
          status: 302,
          headers: { location: "/final" },
          text: "",
          bytes: 0,
          redirectTo: "/final",
        });
      }
      return imageResponse();
    };

    const result = await fetchPublicJson(
      "https://store.com/start",
      Date.now() + 10_000,
      request,
    );

    expect(seen).toEqual([
      "https://store.com/start",
      "https://store.com/final",
    ]);
    expect(result.finalUrl).toBe("https://store.com/final");
    expect(result.redirects).toEqual([
      {
        from: "https://store.com/start",
        to: "https://store.com/final",
        status: 302,
      },
    ]);
    expect(result.text).toContain('"product"');
  });

  it("rejects a product JSON redirect to a loopback address", async () => {
    const request: JsonRequest = async () =>
      imageResponse({
        status: 302,
        headers: { location: "http://127.0.0.1/blocked" },
        text: "",
        bytes: 0,
        redirectTo: "http://127.0.0.1/blocked",
      });

    await expect(
      fetchPublicJson(
        "https://store.com/products/item.json",
        Date.now() + 10_000,
        request,
      ),
    ).rejects.toMatchObject({ code: "UNSAFE_TARGET" });
  });

  it("passes through a non-JSON content error", async () => {
    const request: JsonRequest = async () => {
      throw new AuditScanError(
        "UNSUPPORTED_CONTENT",
        "That address returned text/html, not JSON product data.",
      );
    };

    await expect(
      fetchPublicJson(
        "https://store.com/products/item.json",
        Date.now() + 10_000,
        request,
      ),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_CONTENT" });
  });
});

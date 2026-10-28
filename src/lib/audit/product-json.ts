import { AuditScanError } from "@/lib/audit/errors";
import type {
  AuditCheck,
  AuditCheckStatus,
  AuditSeverity,
  ProductJsonStatus,
} from "@/lib/audit/types";

const MAX_JSON_CHARS = 1 * 1024 * 1024;
const MAX_IMAGES = 250;
const MAX_VARIANTS = 2_000;
const MAX_OPTIONS = 20;
const MAX_TAGS = 100;
const SHORT_DESCRIPTION = 120;

export type ProductImage = {
  alt: string | null;
  position: number;
};

export type ProductVariant = {
  title: string | null;
  price: string | null;
  compareAtPrice: string | null;
  available: boolean | null;
  hasImage: boolean;
};

export type ProductOption = {
  name: string;
  valueCount: number;
};

export type ProductData = {
  title: string | null;
  handle: string | null;
  productType: string | null;
  tags: string[];
  descriptionLength: number;
  descriptionPreview: string;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
};

export type ProductJsonResult =
  | { status: "checked"; data: ProductData }
  | { status: "unavailable"; reason: string }
  | { status: "skipped"; reason: string };

type ParseResult =
  | { ok: true; data: ProductData }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clean(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function priceString(value: unknown): string | null {
  if (typeof value === "string") return clean(value) || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function textFromHtml(html: string) {
  return clean(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&"),
  );
}

/**
 * A Shopify product JSON endpoint only exists for /products/<handle>.
 * Locale prefixes before /products/ are accepted, but extra path segments are
 * not, because they are not a single product resource.
 */
export function extractProductHandle(finalUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(finalUrl);
  } catch {
    return null;
  }

  const match = /\/products\/([a-z0-9][a-z0-9._-]*)\/?$/i.exec(url.pathname);
  if (!match) return null;

  try {
    const handle = decodeURIComponent(match[1]).trim();
    return handle || null;
  } catch {
    return match[1].trim() || null;
  }
}

export function buildProductJsonUrl(finalUrl: string, handle: string) {
  const origin = new URL(finalUrl).origin;
  return `${origin}/products/${encodeURIComponent(handle)}.json`;
}

/**
 * Validates untrusted product JSON before any field is used. Every field is
 * type-checked; unexpected shapes are ignored instead of guessed at.
 */
export function parseProductJson(
  raw: string,
  expectedHandle?: string,
): ParseResult {
  if (raw.length > MAX_JSON_CHARS) {
    return {
      ok: false,
      reason: "The product JSON response was too large to read safely.",
    };
  }

  let root: unknown;
  try {
    root = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      reason: "The store returned a response that was not valid JSON.",
    };
  }

  if (!isRecord(root) || !isRecord(root.product)) {
    return {
      ok: false,
      reason: "The response did not contain a Shopify product object.",
    };
  }

  const product = root.product;
  const handle = typeof product.handle === "string" ? clean(product.handle) : null;
  const title = typeof product.title === "string" ? clean(product.title) : null;

  if (
    expectedHandle &&
    handle &&
    handle.toLowerCase() !== expectedHandle.toLowerCase()
  ) {
    return {
      ok: false,
      reason: "The product JSON did not match the requested product.",
    };
  }

  const hasProductFields =
    Boolean(handle) ||
    Boolean(title) ||
    Array.isArray(product.variants) ||
    Array.isArray(product.images);

  if (!hasProductFields) {
    return {
      ok: false,
      reason: "The product JSON did not contain usable product fields.",
    };
  }

  const bodyHtml =
    typeof product.body_html === "string" ? product.body_html.slice(0, 500_000) : "";
  const description = textFromHtml(bodyHtml);

  const rawTags = product.tags;
  const tags = (Array.isArray(rawTags)
    ? rawTags.filter((tag): tag is string => typeof tag === "string")
    : typeof rawTags === "string"
      ? rawTags.split(",")
      : []
  )
    .map(clean)
    .filter(Boolean)
    .slice(0, MAX_TAGS);

  const productType =
    typeof product.product_type === "string"
      ? clean(product.product_type) || null
      : null;

  const images: ProductImage[] = Array.isArray(product.images)
    ? product.images
        .filter(isRecord)
        .slice(0, MAX_IMAGES)
        .map((image, index) => ({
          alt:
            typeof image.alt === "string" && clean(image.alt)
              ? clean(image.alt)
              : null,
          position:
            typeof image.position === "number" && Number.isFinite(image.position)
              ? image.position
              : index + 1,
        }))
    : [];

  const options: ProductOption[] = Array.isArray(product.options)
    ? product.options
        .filter(isRecord)
        .slice(0, MAX_OPTIONS)
        .map((option, index) => ({
          name:
            typeof option.name === "string" && clean(option.name)
              ? clean(option.name)
              : `Option ${index + 1}`,
          valueCount: Array.isArray(option.values) ? option.values.length : 0,
        }))
    : [];

  const variants: ProductVariant[] = Array.isArray(product.variants)
    ? product.variants
        .filter(isRecord)
        .slice(0, MAX_VARIANTS)
        .map((variant) => ({
          title:
            typeof variant.title === "string" && clean(variant.title)
              ? clean(variant.title)
              : null,
          price: priceString(variant.price),
          compareAtPrice: priceString(variant.compare_at_price),
          available:
            typeof variant.available === "boolean" ? variant.available : null,
          hasImage:
            isRecord(variant.featured_image) ||
            (typeof variant.image_id === "number" && variant.image_id > 0),
        }))
    : [];

  return {
    ok: true,
    data: {
      title,
      handle,
      productType,
      tags,
      descriptionLength: description.length,
      descriptionPreview: description.slice(0, 160),
      images,
      options,
      variants,
    },
  };
}

export function parseProductJsonResult(
  raw: string,
  expectedHandle?: string,
): ProductJsonResult {
  const parsed = parseProductJson(raw, expectedHandle);
  return parsed.ok
    ? { status: "checked", data: parsed.data }
    : { status: "unavailable", reason: parsed.reason };
}

/**
 * Maps a failed fetch to a fixed, hostname-free explanation. The underlying
 * error message is never sent to the browser.
 */
export function productJsonFailureReason(error: unknown): string {
  if (!(error instanceof AuditScanError)) {
    return "The product JSON could not be read.";
  }

  switch (error.code) {
    case "HTTP_ERROR":
      return error.upstreamStatus === 404 || error.upstreamStatus === 410
        ? `Shopify returned HTTP ${error.upstreamStatus} for the product JSON, so the store may have disabled it.`
        : "Shopify returned an error status for the product JSON.";
    case "BLOCKED_BY_SITE":
      return "The store blocked the product JSON request with a login, password, or bot check.";
    case "UNSUPPORTED_CONTENT":
      return "The store returned a non-JSON response instead of product data.";
    case "TIMEOUT":
    case "DNS_TIMEOUT":
      return "The product JSON request timed out.";
    case "RESPONSE_TOO_LARGE":
      return "The product JSON response was larger than the safe limit.";
    case "UNSAFE_TARGET":
      return "The product JSON redirected to an address that cannot be audited safely.";
    case "DNS_FAILED":
      return "The product JSON host could not be resolved.";
    case "TLS_ERROR":
      return "The product JSON request failed its HTTPS certificate check.";
    case "CONNECTION_ERROR":
      return "The connection closed before the product JSON finished loading.";
    case "INVALID_RESPONSE":
    case "UNSUPPORTED_ENCODING":
      return "The product JSON response could not be decoded safely.";
    default:
      return "The product JSON could not be read.";
  }
}

export function productJsonStatus(result: ProductJsonResult): ProductJsonStatus {
  return result.status === "checked"
    ? { status: "checked" }
    : { status: result.status, reason: result.reason };
}

function makeCheck(
  id: string,
  title: string,
  status: AuditCheckStatus,
  severity: AuditSeverity,
  summary: string,
  evidence: string[],
  recommendation: string,
): AuditCheck {
  return {
    id,
    title,
    category: "product",
    status,
    severity,
    summary,
    evidence,
    recommendation,
  };
}

const UNVERIFIED_CHECKS: {
  id: string;
  title: string;
  recommendation: string;
}[] = [
  {
    id: "product-images",
    title: "Product images and alt text",
    recommendation:
      "Open the product in Shopify admin and review its Media section manually. The public product JSON may be disabled or blocked.",
  },
  {
    id: "product-variants",
    title: "Product variants and options",
    recommendation:
      "Open the product in Shopify admin and confirm the options and variants manually before changing anything.",
  },
  {
    id: "product-variant-images",
    title: "Variant images",
    recommendation:
      "Open Products > the product > Variants and check which variants have an assigned image.",
  },
  {
    id: "product-pricing",
    title: "Product prices",
    recommendation:
      "Open Products > the product > Pricing and confirm prices and compare-at prices manually.",
  },
  {
    id: "product-description",
    title: "Product description",
    recommendation:
      "Open Products > the product > Description and review the copy manually.",
  },
  {
    id: "product-taxonomy",
    title: "Product type and tags",
    recommendation:
      "Open Products > the product and check the Product type and Tags fields manually.",
  },
  {
    id: "product-availability",
    title: "Variant availability",
    recommendation:
      "Open Products > the product > Variants and review inventory and availability manually.",
  },
];

function unverifiedChecks(reason: string): AuditCheck[] {
  return UNVERIFIED_CHECKS.map((item) =>
    makeCheck(
      item.id,
      item.title,
      "not-checked",
      "unknown",
      "Product JSON was not available, so this check could not be verified.",
      [reason],
      item.recommendation,
    ),
  );
}

/**
 * Builds the product checks from validated JSON, or honest Unverified checks
 * when the JSON could not be used. It never guesses at missing fields.
 */
export function buildProductChecks(result: ProductJsonResult): AuditCheck[] {
  if (result.status !== "checked") {
    return unverifiedChecks(result.reason);
  }

  const data = result.data;
  const checks: AuditCheck[] = [];
  const imageCount = data.images.length;
  const missingAlt = data.images.filter((image) => !image.alt).length;
  const missingAltPositions = data.images
    .filter((image) => !image.alt)
    .slice(0, 5)
    .map((image) => image.position);

  if (imageCount === 0) {
    checks.push(
      makeCheck(
        "product-images",
        "Product images and alt text",
        "warning",
        "medium",
        "No product images were listed in Shopify product JSON.",
        ["Product JSON images: 0"],
        "Add clear product photos in Shopify admin under Products > the product > Media. Add alt text to each meaningful image.",
      ),
    );
  } else if (missingAlt > 0) {
    checks.push(
      makeCheck(
        "product-images",
        "Product images and alt text",
        "warning",
        missingAlt / imageCount >= 0.5 ? "medium" : "low",
        `${missingAlt} of ${imageCount} product images have no alt text.`,
        [
          `Product JSON images: ${imageCount}`,
          `Images without alt text: ${missingAlt}`,
          missingAltPositions.length > 0
            ? `Positions without alt text: ${missingAltPositions.join(", ")}${missingAlt > missingAltPositions.length ? ", …" : ""}`
            : "",
        ].filter(Boolean),
        "In Shopify admin, open the product's Media section and add descriptive alt text to each meaningful image. Use an empty alt only for decorative images.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "product-images",
        "Product images and alt text",
        "pass",
        "none",
        `All ${imageCount} product images have alt text.`,
        [
          `Product JSON images: ${imageCount}`,
          `Images without alt text: 0`,
        ],
        "No change is needed based on this check. Confirm the images still look correct in a browser.",
      ),
    );
  }

  const variantCount = data.variants.length;
  const optionNames = data.options.map((option) => option.name);

  if (variantCount === 0) {
    checks.push(
      makeCheck(
        "product-variants",
        "Product variants and options",
        "warning",
        "medium",
        "Product JSON lists no variants, so there is no purchasable variant to review.",
        ["Product JSON variants: 0", `Product JSON options: ${data.options.length}`],
        "In Shopify admin, open Products > the product > Variants and add the options and variants customers need. Save, then re-run this audit.",
      ),
    );
  } else if (data.options.length === 0) {
    checks.push(
      makeCheck(
        "product-variants",
        "Product variants and options",
        "warning",
        "low",
        `Product JSON lists ${variantCount} variant${variantCount === 1 ? "" : "s"} but no options.`,
        [
          `Product JSON variants: ${variantCount}`,
          "Product JSON options: 0",
        ],
        "Check the product's Variants section in Shopify admin. A variant usually belongs to at least one option such as Size or Colour.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "product-variants",
        "Product variants and options",
        "pass",
        "none",
        `Product JSON lists ${variantCount} variant${variantCount === 1 ? "" : "s"} across ${data.options.length} option${data.options.length === 1 ? "" : "s"}.`,
        [
          `Product JSON variants: ${variantCount}`,
          `Options: ${optionNames.join(", ")}`,
          data.variants[0]?.title
            ? `First variant: “${data.variants[0].title}”`
            : "",
        ].filter(Boolean),
        "No change is needed based on this check. Confirm the variant picker works on a real phone.",
      ),
    );
  }

  if (variantCount === 0) {
    checks.push(
      makeCheck(
        "product-variant-images",
        "Variant images",
        "not-checked",
        "unknown",
        "No variants were listed, so variant images could not be evaluated.",
        ["Product JSON variants: 0"],
        "Add variants first, then assign images to variants that look visibly different.",
      ),
    );
  } else {
    const variantsWithImage = data.variants.filter(
      (variant) => variant.hasImage,
    ).length;

    if (variantCount > 1 && variantsWithImage === 0) {
      checks.push(
        makeCheck(
          "product-variant-images",
          "Variant images",
          "warning",
          "low",
          `None of the ${variantCount} variants has an assigned image.`,
          [
            `Variants with an assigned image: 0 of ${variantCount}`,
            "Variant images can help shoppers see the exact colour or style they selected.",
          ],
          "In Shopify admin, open Products > the product > Variants and assign an image to variants that look different.",
        ),
      );
    } else {
      checks.push(
        makeCheck(
          "product-variant-images",
          "Variant images",
          "pass",
          "none",
          variantCount === 1
            ? "Only one variant is listed, so separate variant images are not needed."
            : `${variantsWithImage} of ${variantCount} variants have an assigned image.`,
          [
            `Variants with an assigned image: ${variantsWithImage} of ${variantCount}`,
          ],
          "No change is needed based on this check. Assign images only where variants look visibly different.",
        ),
      );
    }
  }

  const priced = data.variants.filter(
    (variant) => variant.price !== null,
  ).length;
  const compareAt = data.variants.filter(
    (variant) => variant.compareAtPrice !== null,
  ).length;

  if (variantCount === 0) {
    checks.push(
      makeCheck(
        "product-pricing",
        "Product prices",
        "not-checked",
        "unknown",
        "No variants were listed, so prices could not be checked.",
        ["Product JSON variants: 0"],
        "Add variants and prices in Shopify admin, then re-run this audit.",
      ),
    );
  } else if (priced === 0) {
    checks.push(
      makeCheck(
        "product-pricing",
        "Product prices",
        "fail",
        "medium",
        "No variant has a price in Shopify product JSON.",
        [
          `Price present: 0 of ${variantCount} variants`,
          `Compare-at price present: ${compareAt} of ${variantCount} variants`,
        ],
        "In Shopify admin, open Products > the product > Pricing and set a price for every variant. This check does not judge your pricing strategy.",
      ),
    );
  } else if (priced < variantCount) {
    checks.push(
      makeCheck(
        "product-pricing",
        "Product prices",
        "warning",
        "low",
        `${variantCount - priced} of ${variantCount} variants have no price in product JSON.`,
        [
          `Price present: ${priced} of ${variantCount} variants`,
          `Compare-at price present: ${compareAt} of ${variantCount} variants`,
        ],
        "Open Products > the product > Pricing and confirm every variant has the price you intend.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "product-pricing",
        "Product prices",
        "pass",
        "none",
        `All ${variantCount} variants have a price.${compareAt > 0 ? ` ${compareAt} also have a compare-at price.` : ""}`,
        [
          `Price present: ${priced} of ${variantCount} variants`,
          `Compare-at price present: ${compareAt} of ${variantCount} variants`,
        ],
        "No change is needed based on this check. Compare-at prices are optional and are not judged here.",
      ),
    );
  }

  if (data.descriptionLength === 0) {
    checks.push(
      makeCheck(
        "product-description",
        "Product description",
        "warning",
        "medium",
        "The product description is empty.",
        ["Description text length: 0 characters"],
        "Open Products > the product > Description and explain what the product is, who it is for, key details, sizing or compatibility, and what is included.",
      ),
    );
  } else if (data.descriptionLength < SHORT_DESCRIPTION) {
    checks.push(
      makeCheck(
        "product-description",
        "Product description",
        "warning",
        "low",
        `The product description is short at ${data.descriptionLength} characters.`,
        [
          `Description text length: ${data.descriptionLength} characters`,
          `Description begins: “${data.descriptionPreview}”`,
        ],
        "Open Products > the product > Description and answer the main buying questions. Keep it specific rather than adding filler.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "product-description",
        "Product description",
        "pass",
        "none",
        `The product description has ${data.descriptionLength} characters of text.`,
        [
          `Description text length: ${data.descriptionLength} characters`,
          `Description begins: “${data.descriptionPreview}”`,
        ],
        "No change is needed based on this check. Review the copy for accuracy and clarity in a browser.",
      ),
    );
  }

  if (!data.productType && data.tags.length === 0) {
    checks.push(
      makeCheck(
        "product-taxonomy",
        "Product type and tags",
        "warning",
        "low",
        "The product has no product type and no tags.",
        ["Product type: not set", "Tags: 0"],
        "In Shopify admin, open Products > the product and add an accurate Product type and a few descriptive tags.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "product-taxonomy",
        "Product type and tags",
        "pass",
        "none",
        "The product has a product type or tags.",
        [
          `Product type: ${data.productType ?? "not set"}`,
          `Tags: ${data.tags.length}${data.tags.length > 0 ? ` (${data.tags.slice(0, 5).join(", ")}${data.tags.length > 5 ? ", …" : ""})` : ""}`,
        ],
        "No change is needed based on this check. Keep the type and tags accurate rather than keyword-stuffed.",
      ),
    );
  }

  const knownAvailability = data.variants.filter(
    (variant) => variant.available !== null,
  );
  const available = knownAvailability.filter(
    (variant) => variant.available === true,
  ).length;

  if (variantCount === 0) {
    checks.push(
      makeCheck(
        "product-availability",
        "Variant availability",
        "not-checked",
        "unknown",
        "No variants were listed, so availability could not be checked.",
        ["Product JSON variants: 0"],
        "Add and review variants in Shopify admin, then re-run this audit.",
      ),
    );
  } else if (knownAvailability.length === 0) {
    checks.push(
      makeCheck(
        "product-availability",
        "Variant availability",
        "not-checked",
        "unknown",
        "Product JSON did not include availability for any variant.",
        [`Variants with an availability field: 0 of ${variantCount}`],
        "Review inventory and availability in Products > the product > Variants.",
      ),
    );
  } else if (available === 0) {
    checks.push(
      makeCheck(
        "product-availability",
        "Variant availability",
        "warning",
        "medium",
        `Every variant with an availability field is marked unavailable (${knownAvailability.length} of ${variantCount}).`,
        [
          `Available variants: 0 of ${knownAvailability.length} with an availability field`,
          `Product JSON variants: ${variantCount}`,
        ],
        "If the product should be purchasable, review inventory and the Continue selling when out of stock setting in Shopify admin. If it is intentionally sold out, this warning is expected.",
      ),
    );
  } else if (available < knownAvailability.length) {
    checks.push(
      makeCheck(
        "product-availability",
        "Variant availability",
        "warning",
        "low",
        `${available} of ${knownAvailability.length} variants with an availability field are available.`,
        [
          `Available variants: ${available} of ${knownAvailability.length}`,
          `Product JSON variants: ${variantCount}`,
        ],
        "Confirm the unavailable variants are intentional. If not, review inventory in Shopify admin.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "product-availability",
        "Variant availability",
        "pass",
        "none",
        `All ${knownAvailability.length} variants with an availability field are available.`,
        [
          `Available variants: ${available} of ${knownAvailability.length}`,
          `Product JSON variants: ${variantCount}`,
        ],
        "No change is needed based on this check. Availability can change at any time.",
      ),
    );
  }

  return checks;
}

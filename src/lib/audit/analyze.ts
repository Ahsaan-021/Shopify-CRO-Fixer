import { parse, type HTMLElement } from "node-html-parser";
import type {
  AuditCheck,
  AuditCheckStatus,
  AuditSeverity,
  AuditVerdict,
} from "@/lib/audit/types";

type AnalysisInput = {
  html: string;
  finalUrl: string;
  httpStatus: number;
  bytes: number;
  xRobotsTag: string;
};

type AnalysisResult = {
  checks: AuditCheck[];
  pageType: "product" | "other";
  pageTypeEvidence: string;
  title: string | null;
  canonicalUrl: string | null;
  verdict: AuditVerdict;
};

const KNOWN_META_DESCRIPTION_MIN = 70;
const KNOWN_META_DESCRIPTION_MAX = 160;
const TITLE_MIN = 10;
const TITLE_MAX = 65;

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function truncate(value: string, max = 180) {
  const clean = cleanText(value);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function findMeta(
  root: HTMLElement,
  attribute: "name" | "property",
  value: string,
) {
  return root
    .querySelectorAll("meta")
    .find(
      (meta) =>
        (meta.getAttribute(attribute) ?? "").toLowerCase() ===
        value.toLowerCase(),
    );
}

function findCanonicalHref(root: HTMLElement) {
  const canonical = root.querySelectorAll("link").find((link) =>
    (link.getAttribute("rel") ?? "")
      .toLowerCase()
      .split(/\s+/)
      .includes("canonical"),
  );

  return cleanText(canonical?.getAttribute("href"));
}

function makeCheck(
  id: string,
  title: string,
  category: AuditCheck["category"],
  status: AuditCheckStatus,
  severity: AuditSeverity,
  summary: string,
  evidence: string[],
  recommendation?: string,
): AuditCheck {
  return {
    id,
    title,
    category,
    status,
    severity,
    summary,
    evidence,
    ...(recommendation ? { recommendation } : {}),
  };
}

function collectProductSchemas(root: HTMLElement) {
  const products: Record<string, unknown>[] = [];
  const scripts = root
    .querySelectorAll('script[type="application/ld+json"]')
    .slice(0, 20);

  let visited = 0;

  const visit = (value: unknown, depth: number) => {
    if (value === null || depth > 8 || visited > 2_000) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (typeof value !== "object") return;

    visited += 1;
    const record = value as Record<string, unknown>;
    const types = Array.isArray(record["@type"])
      ? record["@type"]
      : [record["@type"]];

    if (
      types.some(
        (type) => typeof type === "string" && type.toLowerCase() === "product",
      )
    ) {
      products.push(record);
    }

    for (const nested of Object.values(record)) {
      if (nested !== record) visit(nested, depth + 1);
    }
  };

  for (const script of scripts) {
    const raw = script.textContent.trim();
    if (!raw || raw.length > 250_000) continue;
    try {
      visit(JSON.parse(raw), 0);
    } catch {
      // Invalid JSON-LD is ignored rather than guessed at.
    }
  }

  return products;
}

function productOfferEvidence(product: Record<string, unknown>) {
  const rawOffers = product.offers;
  const offers = Array.isArray(rawOffers)
    ? rawOffers
    : rawOffers
      ? [rawOffers]
      : [];
  const first = offers.find(
    (offer): offer is Record<string, unknown> =>
      typeof offer === "object" && offer !== null,
  );

  if (!first) return null;

  const price =
    typeof first.price === "string" || typeof first.price === "number"
      ? String(first.price)
      : null;
  const currency =
    typeof first.priceCurrency === "string" ? first.priceCurrency : null;
  const availability =
    typeof first.availability === "string"
      ? first.availability.split("/").pop() ?? null
      : null;

  return {
    price: price && currency ? `${price} ${currency}` : price,
    availability,
  };
}

function detectAddToCart(root: HTMLElement) {
  const addForm = root
    .querySelectorAll("form")
    .some((form) => /\/cart\/add/i.test(form.getAttribute("action") ?? ""));

  const addControl = root.querySelectorAll("button, input, a").some((node) => {
    const name = (node.getAttribute("name") ?? "").toLowerCase();
    const value = (node.getAttribute("value") ?? "").toLowerCase();
    const dataType = (node.getAttribute("data-type") ?? "").toLowerCase();
    const id = (node.getAttribute("id") ?? "").toLowerCase();
    const text = cleanText(node.textContent).toLowerCase();

    return (
      name === "add" ||
      dataType.includes("add-to-cart") ||
      id.includes("add-to-cart") ||
      /^add to (cart|bag)$/i.test(text) ||
      /^add to (cart|bag)$/i.test(value)
    );
  });

  return addForm || addControl;
}

function detectTrustSignals(root: HTMLElement) {
  const bodyText = cleanText(root.querySelector("body")?.textContent ?? "")
    .toLowerCase()
    .slice(0, 500_000);
  const hrefs = root
    .querySelectorAll("a[href]")
    .map((link) => (link.getAttribute("href") ?? "").toLowerCase())
    .join(" ");

  const topics = [
    {
      label: "shipping or delivery",
      pattern: /\b(shipping|delivery)\b/,
    },
    {
      label: "returns or refunds",
      pattern: /\b(returns?|refunds?)\b/,
    },
    {
      label: "contact or support",
      pattern: /\b(contact|support|help centre|help center)\b/,
    },
    {
      label: "privacy or security",
      pattern: /\b(privacy|secure checkout|security)\b/,
    },
    {
      label: "guarantee or warranty",
      pattern: /\b(guarantee|warranty|money-back)\b/,
    },
  ];

  return topics.filter(
    (topic) =>
      topic.pattern.test(bodyText) ||
      hrefs.includes(topic.label.split(" ")[0]),
  );
}

export function analyzePage(input: AnalysisInput): AnalysisResult {
  const root = parse(input.html, {
    comment: false,
    blockTextElements: {
      script: true,
      noscript: true,
      style: true,
      pre: true,
    },
  });

  const title = cleanText(root.querySelector("title")?.textContent);
  const description = cleanText(
    findMeta(root, "name", "description")?.getAttribute("content"),
  );
  const h1Elements = root.querySelectorAll("h1");
  const h1Texts = h1Elements
    .map((heading) => cleanText(heading.textContent))
    .filter(Boolean);
  const viewport = cleanText(
    findMeta(root, "name", "viewport")?.getAttribute("content"),
  );
  const htmlElement = root.querySelector("html");
  const language = cleanText(htmlElement?.getAttribute("lang"));
  const robotsContent = cleanText(
    findMeta(root, "name", "robots")?.getAttribute("content"),
  );
  const robots = `${robotsContent} ${input.xRobotsTag}`.toLowerCase();
  const noIndex = /\bnoindex\b/.test(robots);

  const canonicalHref = findCanonicalHref(root);
  let canonicalUrl: string | null = null;
  let canonicalHrefUnusable = false;

  if (canonicalHref) {
    try {
      const resolved = new URL(canonicalHref, input.finalUrl);
      if (resolved.protocol === "http:" || resolved.protocol === "https:") {
        canonicalUrl = resolved.toString();
      } else {
        canonicalHrefUnusable = true;
      }
    } catch {
      canonicalHrefUnusable = true;
    }
  }

  const images = root.querySelectorAll("img");
  const imagesWithoutAlt = images.filter((image) => !image.hasAttribute("alt"));
  const missingAltRatio =
    images.length > 0 ? imagesWithoutAlt.length / images.length : 0;

  const productSchemas = collectProductSchemas(root);
  const productSchema = productSchemas[0];
  const hasAddToCart = detectAddToCart(root);
  const ogType = cleanText(
    findMeta(root, "property", "og:type")?.getAttribute("content"),
  ).toLowerCase();
  const bodyClasses = (
    root.querySelector("body")?.getAttribute("class") ?? ""
  ).toLowerCase();
  const productPath = /\/products?\//i.test(new URL(input.finalUrl).pathname);

  const productSignals: string[] = [];
  if (productPath) productSignals.push("URL contains /products/");
  if (ogType === "product") productSignals.push("og:type is product");
  if (productSchemas.length > 0)
    productSignals.push("Product JSON-LD is present");
  if (bodyClasses.includes("template-product"))
    productSignals.push("template-product body class");
  if (hasAddToCart)
    productSignals.push("a standard add-to-cart control is present");

  const isProductPage = productSignals.length > 0;
  const pageTypeEvidence =
    productSignals.length > 0
      ? productSignals.join("; ")
      : "No product-specific URL or markup signals were found in the initial HTML.";

  const checks: AuditCheck[] = [];
  const httpOk = input.httpStatus >= 200 && input.httpStatus < 300;

  checks.push(
    makeCheck(
      "http-status",
      "HTTP response",
      "technical",
      httpOk ? "pass" : "fail",
      httpOk ? "none" : "high",
      httpOk
        ? `The page returned HTTP ${input.httpStatus}.`
        : `The page returned HTTP ${input.httpStatus} instead of a successful response.`,
      [`HTTP status: ${input.httpStatus}`],
      httpOk
        ? undefined
        : "Check that the page is public and loading correctly. The scanner only audits successful (2xx) HTML responses.",
    ),
  );

  if (!title) {
    checks.push(
      makeCheck(
        "page-title",
        "Page title",
        "content",
        "fail",
        "medium",
        "No page title was found in the initial HTML.",
        ["No <title> element was found."],
        "Add a unique, descriptive <title> that names the page and the store. It appears in browser tabs and search results.",
      ),
    );
  } else if (title.length < TITLE_MIN) {
    checks.push(
      makeCheck(
        "page-title",
        "Page title",
        "content",
        "warning",
        "low",
        `The page title is short at ${title.length} characters.`,
        [`Title: “${truncate(title)}”`],
        "Use a clearer title of roughly 10–65 characters. Focus on the product or page topic, not keyword lists.",
      ),
    );
  } else if (title.length > TITLE_MAX) {
    checks.push(
      makeCheck(
        "page-title",
        "Page title",
        "content",
        "warning",
        "low",
        `The page title is ${title.length} characters and may be truncated in search results.`,
        [`Title: “${truncate(title)}”`],
        "Tighten the title to roughly 10–65 characters so the useful part is less likely to be cut off.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "page-title",
        "Page title",
        "content",
        "pass",
        "none",
        "A descriptive page title is present.",
        [`Length: ${title.length} characters`, `Title: “${truncate(title)}”`],
      ),
    );
  }

  if (!description) {
    checks.push(
      makeCheck(
        "meta-description",
        "Meta description",
        "content",
        "warning",
        "low",
        "No meta description was found in the initial HTML.",
        ["No <meta name=\"description\"> tag was found."],
        "Write a specific description of roughly 70–160 characters. Search engines may use it for the result snippet, but it does not directly change the page layout.",
      ),
    );
  } else if (
    description.length < KNOWN_META_DESCRIPTION_MIN ||
    description.length > KNOWN_META_DESCRIPTION_MAX
  ) {
    checks.push(
      makeCheck(
        "meta-description",
        "Meta description",
        "content",
        "warning",
        "low",
        `The meta description is ${description.length} characters, outside the usual 70–160 character range.`,
        [`Description: “${truncate(description)}”`],
        "Rewrite the description to be specific and concise. Treat the range as guidance rather than a hard rule.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "meta-description",
        "Meta description",
        "content",
        "pass",
        "none",
        "A useful meta description is present.",
        [`Length: ${description.length} characters`],
      ),
    );
  }

  if (h1Elements.length === 0) {
    checks.push(
      makeCheck(
        "main-heading",
        "Main heading",
        "content",
        "fail",
        "medium",
        "No H1 heading was found in the initial HTML.",
        ["No <h1> element was found."],
        "Give the page one clear H1 that describes what the visitor is looking at. This helps both orientation and assistive technology.",
      ),
    );
  } else if (h1Elements.length > 1) {
    checks.push(
      makeCheck(
        "main-heading",
        "Main heading",
        "content",
        "warning",
        "low",
        `The page has ${h1Elements.length} H1 headings.`,
        h1Texts.slice(0, 4).map((heading) => `H1: “${truncate(heading, 100)}”`),
        "Use one primary H1 for the page. Move secondary headings to H2 or H3 unless the theme has a documented reason for multiple H1s.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "main-heading",
        "Main heading",
        "content",
        "pass",
        "none",
        "One H1 heading is present.",
        [`H1: “${truncate(h1Texts[0] ?? "Empty heading", 140)}”`],
      ),
    );
  }

  if (!canonicalHref) {
    checks.push(
      makeCheck(
        "canonical-url",
        "Canonical URL",
        "technical",
        "not-checked",
        "unknown",
        "No canonical link was found in the initial HTML, so it could not be verified.",
        [
          "No <link rel=\"canonical\"> element was found.",
          "A canonical tag may still be added by the server response, a theme setting, or JavaScript after load.",
        ],
        "Confirm the rendered page before adding a tag. Shopify themes often manage canonical URLs automatically, and duplicate conflicting tags cause more problems than a missing one.",
      ),
    );
  } else if (!canonicalUrl || canonicalHrefUnusable) {
    checks.push(
      makeCheck(
        "canonical-url",
        "Canonical URL",
        "technical",
        "warning",
        "low",
        "A canonical link was found, but it is not a usable HTTP or HTTPS address.",
        [`Canonical href: “${truncate(canonicalHref, 160)}”`],
        "Replace the invalid href with an absolute HTTP or HTTPS URL for the preferred version of this page.",
      ),
    );
  } else if (new URL(canonicalUrl).host !== new URL(input.finalUrl).host) {
    checks.push(
      makeCheck(
        "canonical-url",
        "Canonical URL",
        "technical",
        "warning",
        "low",
        "The canonical URL points to a different host than the scanned page.",
        [
          `Canonical: “${truncate(canonicalUrl, 160)}”`,
          `Scanned host: ${new URL(input.finalUrl).host}`,
        ],
        "Confirm this is intentional. A cross-host canonical tells search engines to treat another domain as the preferred version, which can be wrong for a live store page.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "canonical-url",
        "Canonical URL",
        "technical",
        "pass",
        "none",
        "A canonical URL is present and resolves to a web address on the same host.",
        [`Canonical: “${truncate(canonicalUrl, 160)}”`],
      ),
    );
  }

  if (!viewport) {
    checks.push(
      makeCheck(
        "mobile-viewport",
        "Mobile viewport",
        "mobile",
        "fail",
        "high",
        "No viewport meta tag was found, so mobile browsers may render a desktop-width page.",
        ["No <meta name=\"viewport\"> tag was found."],
        "Add a viewport tag with width=device-width and initial-scale=1. Most modern Shopify themes include this by default, so check for a theme or app override.",
      ),
    );
  } else if (!/width\s*=\s*device-width/i.test(viewport)) {
    checks.push(
      makeCheck(
        "mobile-viewport",
        "Mobile viewport",
        "mobile",
        "warning",
        "medium",
        "A viewport tag exists but does not include width=device-width.",
        [`Viewport: “${truncate(viewport, 120)}”`],
        "Use a viewport value such as width=device-width, initial-scale=1 so the layout scales to the device.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "mobile-viewport",
        "Mobile viewport",
        "mobile",
        "pass",
        "none",
        "The page declares a responsive viewport.",
        [`Viewport: “${truncate(viewport, 120)}”`],
      ),
    );
  }

  if (!language) {
    checks.push(
      makeCheck(
        "page-language",
        "Page language",
        "technical",
        "warning",
        "medium",
        "The <html> element does not declare a language.",
        ["No lang attribute was found on <html>."],
        "Add the page language, for example <html lang=\"en\">. This helps screen readers pronounce content correctly.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "page-language",
        "Page language",
        "technical",
        "pass",
        "none",
        "The page declares its language.",
        [`Language: “${truncate(language, 40)}”`],
      ),
    );
  }

  if (images.length === 0) {
    checks.push(
      makeCheck(
        "image-alt",
        "Image alternative text",
        "technical",
        "not-checked",
        "unknown",
        "No <img> elements were available in the initial HTML, so alt text could not be evaluated.",
        ["No server-rendered images were found."],
        "If images appear in a browser but not here, they may be loaded by JavaScript. Review them manually or in a later rendered-page audit.",
      ),
    );
  } else if (imagesWithoutAlt.length === 0) {
    checks.push(
      makeCheck(
        "image-alt",
        "Image alternative text",
        "technical",
        "pass",
        "none",
        `All ${images.length} server-rendered image${images.length === 1 ? "" : "s"} include an alt attribute.`,
        [`${images.length} <img> element${images.length === 1 ? "" : "s"} checked`],
      ),
    );
  } else {
    const severe = missingAltRatio >= 0.25 || imagesWithoutAlt.length >= 8;
    checks.push(
      makeCheck(
        "image-alt",
        "Image alternative text",
        "technical",
        severe ? "fail" : "warning",
        severe ? "medium" : "low",
        `${imagesWithoutAlt.length} of ${images.length} image${images.length === 1 ? "" : "s"} have no alt attribute.`,
        [
          `${imagesWithoutAlt.length} <img> element${imagesWithoutAlt.length === 1 ? "" : "s"} missing alt`,
          `${Math.round(missingAltRatio * 100)}% of server-rendered images affected`,
        ],
        "Add meaningful alt text to product and informational images. Use an empty alt=\"\" only when an image is purely decorative.",
      ),
    );
  }

  if (noIndex) {
    checks.push(
      makeCheck(
        "indexability",
        "Search indexing",
        "technical",
        "fail",
        "high",
        "The page asks search engines not to index it.",
        [
          robotsContent ? `Meta robots: “${truncate(robotsContent, 100)}”` : "",
          input.xRobotsTag
            ? `X-Robots-Tag: “${truncate(input.xRobotsTag, 100)}”`
            : "",
        ].filter(Boolean),
        "If this is a live store page that should appear in search, remove the noindex directive. Leave it in place if the page is intentionally private or a staging page.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "indexability",
        "Search indexing",
        "technical",
        "pass",
        "none",
        "No noindex directive was found in the response.",
        [
          robotsContent
            ? `Meta robots: “${truncate(robotsContent, 100)}”`
            : "No restrictive meta robots tag was found.",
        ],
      ),
    );
  }

  if (!isProductPage) {
    checks.push(
      makeCheck(
        "product-page",
        "Product page markup",
        "product",
        "not-checked",
        "unknown",
        "The submitted page does not look like a product page, so product-specific checks were skipped.",
        [pageTypeEvidence],
        "Audit a direct /products/ URL to check Product structured data and add-to-cart markup.",
      ),
    );
  } else {
    const offer = productSchema
      ? productOfferEvidence(productSchema)
      : null;
    const productName =
      typeof productSchema?.name === "string"
        ? truncate(productSchema.name, 90)
        : null;

    const evidence = [
      productSchema
        ? `Product JSON-LD found${productName ? `: “${productName}”` : ""}.`
        : "No Product JSON-LD was found in the initial HTML.",
      hasAddToCart
        ? "A standard add-to-cart form or control was found."
        : "No standard add-to-cart form or control was found in the initial HTML.",
    ];

    if (offer?.price) {
      evidence.push(
        `Offers data: ${offer.price}${offer.availability ? `, ${offer.availability.toLowerCase()}` : ""}.`,
      );
    }

    if (productSchema && hasAddToCart) {
      checks.push(
        makeCheck(
          "product-page",
          "Product page markup",
          "product",
          "pass",
          "none",
          "Product structured data and a standard add-to-cart control were both present.",
          evidence,
        ),
      );
    } else {
      checks.push(
        makeCheck(
          "product-page",
          "Product page markup",
          "product",
          "warning",
          "medium",
          productSchema
            ? "Product structured data was found, but no standard add-to-cart control appeared in the initial HTML."
            : hasAddToCart
              ? "Add-to-cart markup was found, but Product structured data was missing."
              : "Product page signals were detected, but neither Product JSON-LD nor a standard add-to-cart control was found in the initial HTML.",
          evidence,
          "Check the product page in a browser before changing code: themes and apps may add these elements with JavaScript. If they are genuinely missing, add valid Product structured data and a clearly labelled add-to-cart button.",
        ),
      );
    }
  }

  const trustTopics = detectTrustSignals(root);
  if (trustTopics.length >= 2) {
    checks.push(
      makeCheck(
        "trust-signals",
        "Support and policy signals",
        "trust",
        "pass",
        "none",
        "Shipping, returns, support, or security references were found in the page text.",
        [
          `Topics detected: ${trustTopics.map((topic) => topic.label).join(", ")}.`,
          "This is a text-presence check only; the quality and accuracy of each policy still need human review.",
        ],
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "trust-signals",
        "Support and policy signals",
        "trust",
        "not-checked",
        "unknown",
        "There was not enough server-rendered policy or support text to evaluate trust signals.",
        [
          trustTopics.length === 0
            ? "No shipping, returns, support, privacy, or guarantee references were detected in the initial HTML."
            : `Only one relevant topic was detected (${trustTopics[0]?.label}).`,
          "Useful content may sit in menus, accordions, or content loaded by JavaScript.",
        ],
        "Review the visible product page and checkout manually. Make shipping, returns, support, and security information easy to find.",
      ),
    );
  }

  checks.push(
    makeCheck(
      "mobile-experience",
      "Mobile layout and tap targets",
      "mobile",
      "not-checked",
      "unknown",
      "Visual mobile usability cannot be verified from static HTML alone.",
      [
        "Tap-target size, horizontal overflow, sticky add-to-cart behaviour, and text reflow require a rendered browser review.",
      ],
      "Test the page on a real phone or in a mobile browser at 360–390 px width. Check the buy button, variant pickers, menus, and form fields.",
    ),
  );

  checks.push(
    makeCheck(
      "performance",
      "Speed and Core Web Vitals",
      "technical",
      "not-checked",
      "unknown",
      "Page speed was not measured by this audit.",
      [
        "The scanner downloads HTML only. It does not run scripts, load images, or collect field performance data.",
      ],
      "Use Chrome Lighthouse or PageSpeed Insights to measure performance separately. Treat any score as a starting point, not a conversion diagnosis.",
    ),
  );

  checks.push(
    makeCheck(
      "checkout-confidence",
      "Cart and checkout flow",
      "trust",
      "not-checked",
      "unknown",
      "The cart and checkout flow was not tested.",
      [
        "The scanner does not add products, run a real checkout, or inspect payment, shipping, or account steps.",
      ],
      "Run a test purchase on a staging store, including the mobile flow. Review shipping costs, delivery estimates, returns messaging, and error states.",
    ),
  );

  const passed = checks.filter((check) => check.status === "pass").length;
  const warnings = checks.filter((check) => check.status === "warning").length;
  const failed = checks.filter((check) => check.status === "fail").length;
  const highSeverityFailure = checks.some(
    (check) => check.status === "fail" && check.severity === "high",
  );

  let verdict: AuditVerdict;
  if (failed >= 2 || highSeverityFailure) {
    verdict = "major-issues";
  } else if (failed > 0 || warnings > 0) {
    verdict = "needs-attention";
  } else if (passed >= 3) {
    verdict = "no-obvious-issues";
  } else {
    verdict = "limited";
  }

  return {
    checks,
    pageType: isProductPage ? "product" : "other",
    pageTypeEvidence,
    title: title || null,
    canonicalUrl,
    verdict,
  };
}

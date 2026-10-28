import type {
  AuditCategory,
  AuditCheck,
  AuditEffort,
  AuditPriority,
  AuditSnippet,
  FixPlanItem,
} from "@/lib/audit/types";

const SNIPPET_LABEL =
  "Example - adapt to your theme, back up your theme first";

const PRIORITY_RANK: Record<AuditPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const SEVERITY_RANK: Record<AuditCheck["severity"], number> = {
  high: 0,
  medium: 1,
  low: 2,
  unknown: 3,
  none: 4,
};

/**
 * Deterministic editorial priority rules. These are not a prediction of
 * conversion lift and do not use revenue, traffic, or customer data.
 *
 * - Failed check + high or medium severity -> High
 * - Failed check + low severity -> Medium
 * - Warning + high or medium severity -> Medium
 * - Warning + low severity -> Low
 * - Passed and unverified checks are not placed in the fix plan
 */
export function priorityFor(check: AuditCheck): AuditPriority | undefined {
  if (check.status === "fail") {
    return check.severity === "low" ? "medium" : "high";
  }

  if (check.status === "warning") {
    return check.severity === "high" || check.severity === "medium"
      ? "medium"
      : "low";
  }

  return undefined;
}

const EFFORT_BY_CHECK: Record<string, AuditEffort> = {
  "page-title": "easy",
  "meta-description": "easy",
  "page-language": "easy",
  "image-alt": "easy",
  "mobile-viewport": "easy",
  indexability: "easy",
  "product-images": "easy",
  "product-pricing": "easy",
  "product-description": "easy",
  "product-taxonomy": "easy",
  "main-heading": "moderate",
  "product-page": "moderate",
  "product-variants": "moderate",
  "product-variant-images": "moderate",
  "product-availability": "moderate",
  "trust-signals": "moderate",
  "canonical-url": "advanced",
  performance: "advanced",
  "checkout-confidence": "advanced",
  "mobile-experience": "advanced",
};

const DEFAULT_EFFORT: Record<AuditCategory, AuditEffort> = {
  content: "easy",
  product: "moderate",
  mobile: "moderate",
  trust: "moderate",
  technical: "moderate",
};

export function effortFor(check: AuditCheck): AuditEffort {
  return EFFORT_BY_CHECK[check.id] ?? DEFAULT_EFFORT[check.category];
}

const FIX_STEPS: Record<string, string[]> = {
  "page-title": [
    "In Shopify admin, open Products and select the product.",
    "Edit the Title field so it clearly names the product. Most themes use this as the visible page title and part of the HTML title.",
    "For the search-result title, open Search engine listing > Edit and adjust the title there. Save the product.",
    "Re-run this audit and confirm the new title appears in the page HTML.",
  ],
  "meta-description": [
    "In Shopify admin, open Products and select the product.",
    "Scroll to Search engine listing, choose Edit, and write a specific meta description of roughly 70-160 characters.",
    "For the homepage or collections, check Online Store > Preferences and the collection's Search engine listing settings.",
    "Save, then re-run this audit.",
  ],
  "main-heading": [
    "Open Online Store > Themes > Customize and go to the product page template.",
    "Check that the product title block is present and set as the main heading.",
    "If your theme does not output an H1, open the theme code and check sections/main-product.liquid. Add one H1 around the product title.",
    "Keep other section headings as H2 or H3. Back up the theme before editing code.",
  ],
  "mobile-viewport": [
    "Open Online Store > Themes, click the three dots on your live theme, and choose Edit code.",
    "Open layout/theme.liquid and find the <head> section.",
    "Confirm there is a viewport meta tag with width=device-width. Remove duplicate conflicting viewport tags.",
    "Save, then re-run this audit. Most modern Shopify themes already include this tag.",
  ],
  "image-alt": [
    "In Shopify admin, open Products and select the product.",
    "In the Media section, click an image and add descriptive alt text that explains what the image shows.",
    "For banners or section images, add alt text in Online Store > Themes > Customize or in the section settings.",
    "Repeat for meaningful images. Use an empty alt only for decorative images, then re-run this audit.",
  ],
  "product-images": [
    "In Shopify admin, open Products and select the product.",
    "Review the Media section: keep a clear main shot, close-ups, and in-use photos, and add any important missing views.",
    "Click each image and add descriptive alt text, especially where the image shows a detail a shopper needs.",
    "Save and re-run this audit.",
  ],
  "product-variants": [
    "In Shopify admin, open Products and select the product.",
    "In the Variants section, add the options customers need, such as Size or Colour, and generate the variants.",
    "Check that each variant has a price and the inventory settings you intend.",
    "Save and re-run this audit.",
  ],
  "product-variant-images": [
    "In Shopify admin, open Products and select the product.",
    "Open the Variants section and edit the variant that should show a specific image.",
    "Assign the matching image to that variant. Repeat where a variant looks visibly different.",
    "Save and re-run this audit.",
  ],
  "product-pricing": [
    "In Shopify admin, open Products and select the product.",
    "Open the Pricing section and confirm every variant has a price.",
    "A compare-at price is optional. Only use it when it reflects a genuine regular price.",
    "Save and re-run this audit. This check does not judge your pricing strategy.",
  ],
  "product-description": [
    "In Shopify admin, open Products and select the product.",
    "Write a description that answers the main buying questions: what it is, who it is for, key details, sizing or compatibility, and what is included.",
    "Use short paragraphs and headings or bullets where they help scanning. Avoid copying manufacturer text without checking it.",
    "Save and re-run this audit.",
  ],
  "product-taxonomy": [
    "In Shopify admin, open Products and select the product.",
    "Set a useful Product type, for example the product category customers would recognise.",
    "Add a few accurate tags that describe the product. Do not add unrelated keyword lists.",
    "Save and re-run this audit.",
  ],
  "product-availability": [
    "In Shopify admin, open Products and select the product.",
    "Open the Variants section and review inventory and the Continue selling when out of stock setting for each variant.",
    "If a variant should be purchasable, confirm it is available. If the product is intentionally sold out, this warning can be expected.",
    "Save and re-run this audit.",
  ],
  "product-page": [
    "Open the product page in a normal browser and confirm the add-to-cart form and Product structured data are present after JavaScript runs.",
    "If add-to-cart is missing, check Online Store > Themes > Customize for the product template and make sure the buy-buttons block is enabled.",
    "If Product JSON-LD is missing, check whether your theme already outputs it before adding a second copy. Duplicate structured data can confuse search engines.",
    "Back up the theme before editing sections/main-product.liquid.",
  ],
  "canonical-url": [
    "Shopify usually manages canonical URLs automatically, so first confirm the rendered page in a browser.",
    "Open Online Store > Themes > Edit code and search layout/theme.liquid for an existing rel=canonical tag.",
    "Remove duplicate or conflicting canonical tags. Do not add a second tag if the theme already outputs one.",
    "Back up the theme and test on a duplicate theme before publishing.",
  ],
  indexability: [
    "Confirm whether this page is meant to appear in search. Staging and password-protected stores are often intentionally hidden.",
    "Open Online Store > Preferences and check whether password protection is enabled.",
    "Search the theme code for noindex directives if the page should be public.",
    "Remove only the directive that is hiding a page you want indexed, then re-run this audit.",
  ],
  "trust-signals": [
    "Decide which reassurance customers need before buying: delivery time, returns, support, warranty, or secure payment.",
    "Add the key points near the buy button or in the product description, and keep the full details in your policy pages.",
    "In Shopify admin, review Settings > Policies for shipping, returns, privacy, and terms.",
    "Add clear links in Online Store > Navigation, usually in the footer menu.",
  ],
  performance: [
    "Run Google PageSpeed Insights on the same mobile URL and compare its opportunities with this report.",
    "In Shopify admin, compress oversized images and remove apps or theme sections that are not needed on this page.",
    "Check Online Store > Themes > Customize for heavy sliders, videos, or recommendation sections above the fold.",
    "Test one change at a time on a duplicate theme and measure again.",
  ],
  "checkout-confidence": [
    "Run a real test purchase on a staging or test mode setup, including the mobile flow.",
    "Review shipping costs, delivery estimates, taxes, return messaging, and error states before payment.",
    "In Shopify admin, check Settings > Payments, Shipping and delivery, and Policies.",
    "Ask someone unfamiliar with the store to complete the flow and note where they hesitate.",
  ],
  "mobile-experience": [
    "Open the page on a real phone or in a browser at 360-390 px width.",
    "Check the buy button, variant pickers, menus, forms, sticky headers, and horizontal scrolling.",
    "Use Online Store > Themes > Customize to review the mobile preview and simplify crowded sections.",
    "Fix the most important obstruction first, then test again on a real device.",
  ],
};

const GENERIC_STEPS = [
  "Open the page in a browser and confirm the issue is visible after the page finishes loading.",
  "Make the smallest change in Shopify admin or your theme that addresses the finding.",
  "Back up your theme before editing code, and test on a duplicate theme where possible.",
  "Re-run this audit and verify the change in a real browser.",
];

const SNIPPETS: Record<string, AuditSnippet> = {
  "page-title": {
    label: SNIPPET_LABEL,
    language: "liquid",
    code: "<title>{{ page_title }}{% unless page_title contains shop.name %} - {{ shop.name }}{% endunless %}</title>",
  },
  "main-heading": {
    label: SNIPPET_LABEL,
    language: "liquid",
    code: '<h1 class="product__title">{{ product.title | escape }}</h1>',
  },
  "mobile-viewport": {
    label: SNIPPET_LABEL,
    language: "html",
    code: '<meta name="viewport" content="width=device-width, initial-scale=1">',
  },
  "image-alt": {
    label: SNIPPET_LABEL,
    language: "liquid",
    code: '<img\n  src="{{ image | image_url: width: 1200 }}"\n  alt="{{ image.alt | escape }}"\n  loading="lazy"\n  width="{{ image.width }}"\n  height="{{ image.height }}"\n>',
  },
  "canonical-url": {
    label: SNIPPET_LABEL,
    language: "liquid",
    code: '<link rel="canonical" href="{{ canonical_url }}">',
  },
  "product-page": {
    label: SNIPPET_LABEL,
    language: "liquid",
    code: '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Product",\n  "name": {{ product.title | json }},\n  "image": [{{ product.featured_image | image_url: width: 1200 | prepend: "https:" | json }}],\n  "offers": {\n    "@type": "Offer",\n    "price": {{ product.selected_or_first_available_variant.price | divided_by: 100.0 | json }},\n    "priceCurrency": {{ cart.currency.iso_code | json }},\n    "availability": {% if product.available %}"https://schema.org/InStock"{% else %}"https://schema.org/OutOfStock"{% endif %}\n  }\n}\n</script>',
  },
};

export function stepsFor(check: AuditCheck): string[] {
  return FIX_STEPS[check.id] ?? GENERIC_STEPS;
}

export function snippetFor(check: AuditCheck): AuditSnippet | undefined {
  return SNIPPETS[check.id];
}

/**
 * Adds the editorial priority, effort, and Shopify instructions to a check.
 * Passed and unverified checks are returned unchanged.
 */
export function applyFixPlan(check: AuditCheck): AuditCheck {
  const priority = priorityFor(check);
  if (!priority) return check;

  const snippet = check.snippet ?? snippetFor(check);

  return {
    ...check,
    priority,
    effort: check.effort ?? effortFor(check),
    fixSteps: check.fixSteps ?? stepsFor(check),
    ...(snippet ? { snippet } : {}),
  };
}

function compareChecks(a: AuditCheck, b: AuditCheck) {
  const priorityA = a.priority ? PRIORITY_RANK[a.priority] : 3;
  const priorityB = b.priority ? PRIORITY_RANK[b.priority] : 3;
  if (priorityA !== priorityB) return priorityA - priorityB;

  const severityA = SEVERITY_RANK[a.severity];
  const severityB = SEVERITY_RANK[b.severity];
  if (severityA !== severityB) return severityA - severityB;

  if (a.status !== b.status) return a.status === "fail" ? -1 : 1;
  return 0;
}

/**
 * Builds the short top-of-report fix plan in deterministic priority order.
 * Only checks that actually failed or warned are included.
 */
export function buildFixPlan(
  checks: AuditCheck[],
  limit = 6,
): FixPlanItem[] {
  return checks
    .filter(
      (check) =>
        (check.status === "fail" || check.status === "warning") &&
        check.priority &&
        check.effort &&
        check.fixSteps &&
        check.fixSteps.length > 0,
    )
    .sort(compareChecks)
    .slice(0, limit)
    .map((check) => ({
      checkId: check.id,
      title: check.title,
      category: check.category,
      priority: check.priority as AuditPriority,
      effort: check.effort as AuditEffort,
      summary: check.summary,
      steps: check.fixSteps as string[],
      ...(check.snippet ? { snippet: check.snippet } : {}),
    }));
}

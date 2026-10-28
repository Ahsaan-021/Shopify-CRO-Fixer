export const siteConfig = {
  name: "Shopify CRO Fixer",
  description:
    "Run a free, evidence-based static HTML audit of a Shopify page. Find product-page, mobile, trust, and technical issues worth fixing.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  ),
  nav: [
    { href: "/", label: "Home" },
    { href: "/audit", label: "Audit" },
    { href: "/blog", label: "Blog" },
    { href: "/pricing", label: "Pricing" },
  ],
} as const;

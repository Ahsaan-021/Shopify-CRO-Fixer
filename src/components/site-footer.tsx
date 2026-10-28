import Link from "next/link";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/ui/icon";

const productLinks = [
  { href: "/audit", label: "Free audit" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "CRO blog" },
];

const resourceLinks = [
  {
    href: "/blog/shopify-product-page-cro",
    label: "Product page fundamentals",
  },
  {
    href: "/blog/mobile-ux-shopify-conversions",
    label: "Mobile UX checklist",
  },
  {
    href: "/blog/trust-signals-checkout",
    label: "Trust and checkout confidence",
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1.3fr]">
          <div>
            <Brand inverse />
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/70">
              A focused toolkit for finding conversion friction on Shopify
              stores. Start with the page your customers see most.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/75">
              <Icon name="shield" size={14} />
              No store login or admin access required
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/50">
              Product
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded-sm text-white/75 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/50">
              Practical reading
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded-sm text-white/75 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs leading-5 text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Shopify CRO Fixer. Built for practical, evidence-led improvements.</p>
          <p>
            Independent tool. Not affiliated with or endorsed by Shopify Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}

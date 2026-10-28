import type { Metadata } from "next";
import Link from "next/link";
import { AuditWorkspace } from "@/components/audit/audit-workspace";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Free Shopify page audit",
  description:
    "Audit a public Shopify page for verifiable product-page, mobile, trust, and technical signals. See evidence and practical fixes without a login.",
  alternates: {
    canonical: "/audit",
  },
};

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  const params = await searchParams;
  const rawUrl = params.url;
  const initialUrl =
    typeof rawUrl === "string" ? rawUrl : Array.isArray(rawUrl) ? rawUrl[0] : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <Icon name="arrow-right" size={15} className="rotate-180" />
        Back to home
      </Link>

      <div className="mt-6 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Live static HTML audit
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Run a free Shopify page audit.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          Start with a single page your customers actually see. We&apos;ll show
          what was verifiable, what was not, and the most useful next step—not
          an invented conversion score.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-ink-soft">
          <span className="flex items-center gap-1.5">
            <Icon name="check" size={14} className="text-accent" />
            No login
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="check" size={14} className="text-accent" />
            No store access
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="check" size={14} className="text-accent" />
            No scripts executed
          </span>
        </div>
      </div>

      <div className="mt-9">
        <AuditWorkspace
          key={initialUrl || "empty-audit"}
          initialUrl={initialUrl || undefined}
        />
      </div>

      <div className="mt-12 rounded-2xl border border-line bg-white p-6 sm:p-7">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Get more from the audit
        </h2>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-ink-soft">
              Audit a product page
            </p>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              Product-specific checks need a direct{" "}
              <span className="break-all font-mono text-xs">/products/...</span>{" "}
              URL or product markup in the HTML.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-soft">
              Verify before editing
            </p>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              Themes and apps can change markup after the initial response.
              Confirm each finding in a browser.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-soft">
              Read the fundamentals
            </p>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              Pair the report with our guides on{" "}
              <Link
                href="/blog/shopify-product-page-cro"
                className="font-medium text-accent-dark underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
              >
                product-page CRO
              </Link>{" "}
              and{" "}
              <Link
                href="/blog/mobile-ux-shopify-conversions"
                className="font-medium text-accent-dark underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
              >
                mobile UX
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

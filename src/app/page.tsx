import type { Metadata } from "next";
import { AuditStartForm } from "@/components/audit-start-form";
import { CtaBanner } from "@/components/cta-banner";
import { DemoReport } from "@/components/demo-report";
import { FeatureCard } from "@/components/feature-card";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Free Shopify CRO audit and conversion checks",
  description:
    "Audit a Shopify product page for product-page UX, mobile, trust, and technical issues. See the exact evidence and a practical next step. No login required.",
  alternates: {
    canonical: "/",
  },
};

const workflow = [
  {
    number: "01",
    title: "Submit a public page",
    description:
      "Use a store homepage or, better, a direct product URL. The audit reads one server-rendered page—no admin access or app install.",
  },
  {
    number: "02",
    title: "Inspect verifiable signals",
    description:
      "We check the HTML for titles, headings, mobile viewport setup, alt text, product markup, indexing directives, and more.",
  },
  {
    number: "03",
    title: "Fix the clearest gap",
    description:
      "Every flagged finding shows its evidence and a suggested next step. Anything that needs a browser or human judgment is marked as unverified.",
  },
];

const features = [
  {
    icon: "layout" as const,
    title: "Product-page UX",
    description:
      "Look for the page signals that orient a shopper: a clear H1, useful metadata, product structured data, and a standard add-to-cart control.",
    detail: "Checks visible server-rendered markup, not app behaviour.",
  },
  {
    icon: "smartphone" as const,
    title: "Mobile usability",
    description:
      "Verify the responsive viewport declaration and flag image-alt gaps that affect mobile shoppers using assistive technology.",
    detail: "Visual tap-target testing is honestly marked as unverified.",
  },
  {
    icon: "shield" as const,
    title: "Trust signals",
    description:
      "See whether initial HTML contains references to shipping, returns, support, privacy, or guarantees—without pretending a text match proves trust.",
    detail: "Presence is evidence; policy quality still needs review.",
  },
  {
    icon: "code" as const,
    title: "Technical checks",
    description:
      "Catch missing titles, language attributes, index-blocking directives, and common metadata problems that can undermine a page.",
    detail: "No scripts from the scanned site are ever executed.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="hero-grid pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-accent-dark shadow-sm">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              Free Shopify CRO audit · No login
            </p>
            <h1 className="mt-6 text-[2.6rem] font-bold leading-[1.05] tracking-[-0.035em] text-ink sm:text-6xl">
              Find what&apos;s blocking your{" "}
              <span className="text-accent">Shopify conversions.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink-soft">
              Run a free static HTML audit of a store page. See concrete
              product-page, mobile, trust, and technical signals—with the
              evidence and the next fix, not a made-up score.
            </p>

            <div className="mt-8 max-w-xl">
              <AuditStartForm />
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              {[
                "Evidence for every finding",
                "No store access",
                "Unsafe targets blocked",
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Icon name="check" size={15} className="text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              className="absolute -inset-4 rotate-2 rounded-[2rem] border border-accent/15 bg-accent-soft/70"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_70px_-32px_rgba(16,37,28,0.35)]">
              <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-3">
                <span className="size-2.5 rounded-full bg-line-strong" />
                <span className="size-2.5 rounded-full bg-line-strong" />
                <span className="size-2.5 rounded-full bg-line-strong" />
                <span className="ml-2 flex-1 truncate rounded-md border border-line bg-white px-3 py-1.5 text-[0.68rem] text-muted">
                  your-store.com/products/example
                </span>
              </div>

              <div className="grid grid-cols-[0.9fr_1.1fr] gap-4 p-4 sm:gap-5 sm:p-5">
                <div className="flex min-h-44 items-center justify-center rounded-xl border border-line bg-accent-soft/70">
                  <span className="flex flex-col items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-accent-dark/70">
                    <Icon name="layout" size={28} />
                    Product image
                  </span>
                </div>
                <div className="py-1">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-accent">
                    Example product
                  </p>
                  <div className="mt-2 h-5 w-4/5 rounded bg-ink/90" />
                  <div className="mt-2 h-3 w-full rounded bg-line" />
                  <div className="mt-1.5 h-3 w-3/4 rounded bg-line" />
                  <p className="mt-4 text-lg font-bold text-ink">$68.00</p>
                  <div className="mt-3 rounded-lg bg-accent px-3 py-2.5 text-center text-xs font-semibold text-white">
                    Add to cart
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2.5 w-full rounded bg-line" />
                    <div className="h-2.5 w-5/6 rounded bg-line" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-line bg-white px-4 py-3">
                <span className="flex items-center gap-1.5 text-[0.7rem] font-medium text-muted">
                  <Icon name="info" size={14} />
                  Illustration only — not a store or live report
                </span>
                <span className="hidden rounded-full bg-ink px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-wide text-white sm:inline">
                  Page anatomy
                </span>
              </div>
            </div>

            <div className="absolute -left-3 top-[42%] hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 shadow-lg sm:flex lg:-left-8">
              <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon name="check" size={15} />
              </span>
              <span>
                <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                  Clear H1
                </span>
                <span className="block text-xs font-semibold text-ink">
                  Found in HTML
                </span>
              </span>
            </div>

            <div className="absolute -right-3 bottom-[22%] hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 shadow-lg sm:flex lg:-right-8">
              <span className="flex size-7 items-center justify-center rounded-full bg-warning-soft text-warning">
                <Icon name="alert" size={15} />
              </span>
              <span>
                <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                  Alt text
                </span>
                <span className="block text-xs font-semibold text-ink">
                  Needs review
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Product principles"
        className="border-b border-line bg-white"
      >
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            {
              icon: "code" as const,
              title: "Static HTML checks",
              text: "No scripts executed",
            },
            {
              icon: "search" as const,
              title: "Evidence shown",
              text: "See the actual signal",
            },
            {
              icon: "shield" as const,
              title: "Safe by design",
              text: "Private targets rejected",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-dark">
                <Icon name={item.icon} size={20} />
              </span>
              <p>
                <span className="block text-sm font-semibold text-ink">
                  {item.title}
                </span>
                <span className="block text-xs text-muted">{item.text}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              From URL to a useful next step in three moves.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              The first version is deliberately focused. It gives you a
              trustworthy starting point without pretending to replace customer
              research, analytics, or a full UX review.
            </p>
          </div>

          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {workflow.map((step, index) => (
              <li
                key={step.number}
                className="relative rounded-2xl border border-line bg-white p-6 sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-accent">
                    {step.number}
                  </span>
                  {index < workflow.length - 1 ? (
                    <Icon
                      name="arrow-right"
                      size={18}
                      className="hidden text-line-strong md:block"
                    />
                  ) : (
                    <Icon
                      name="check"
                      size={18}
                      className="hidden text-accent md:block"
                    />
                  )}
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-line bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                What gets checked
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Four areas where small gaps become lost orders.
              </h2>
            </div>
            <ButtonLink href="/audit" variant="secondary">
              See the full audit
              <Icon name="arrow-right" size={17} />
            </ButtonLink>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-accent/20 bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-accent-dark">
                <Icon name="shield" size={17} />
              </span>
              <div>
                <h3 className="font-semibold text-ink">
                  Honest by default, including the gaps.
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
                  If a check needs JavaScript, a real browser, an interaction,
                  or a human decision, the report says so instead of guessing.
                </p>
              </div>
            </div>
            <ButtonLink href="/blog/trust-signals-checkout" variant="secondary" size="sm">
              Read our approach
            </ButtonLink>
          </div>
        </div>
      </section>

      <DemoReport />

      <CtaBanner />
    </>
  );
}

import type { Metadata } from "next";
import { CtaBanner } from "@/components/cta-banner";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Shopify CRO Fixer is free in its first phase. See exactly what the free audit includes, what is not available yet, and the planned Pro scope.",
  alternates: {
    canonical: "/pricing",
  },
};

const freeFeatures = [
  "One public page per audit",
  "14 static HTML checks",
  "Evidence for every finding",
  "Suggested fixes and verification steps",
  "Product-page, mobile, trust, and technical signals",
  "No account, installation, or Shopify access",
  "Up to 5 scans per 10 minutes per visitor",
];

const plannedFeatures = [
  "Rendered-page checks with JavaScript",
  "Multi-page crawl and issue prioritisation",
  "Saved reports and scan history",
  "PDF and CSV exports",
  "Team workspaces and shared notes",
  "A verified waitlist before any payment",
];

const faqs = [
  {
    question: "Is the audit actually free?",
    answer:
      "Yes. The current version is free to use, with no payment flow and no credit card. A small in-memory rate limit prevents one visitor from exhausting the demo server.",
  },
  {
    question: "Do I need to connect my Shopify store?",
    answer:
      "No. The scanner only requests a public HTTP or HTTPS page. It does not install an app, request admin access, or read private store data.",
  },
  {
    question: "Do you store my report?",
    answer:
      "This version has no database and does not save reports. The rate limiter keeps a short-lived, in-memory count per request source. A future saved-report feature would need explicit account and retention decisions.",
  },
  {
    question: "Can it audit my whole store?",
    answer:
      "Not yet. It audits one page at a time. For product-specific checks, submit a direct product URL. Multi-page crawling is part of the planned Pro scope, not a current feature.",
  },
  {
    question: "Does a good result guarantee more sales?",
    answer:
      "No. The audit verifies a small set of HTML signals. It does not measure customer intent, offer quality, page speed, visual usability, or checkout performance. Use it as a starting point for evidence-led review.",
  },
  {
    question: "When will Pro be available?",
    answer:
      "There is no launch date to promise yet. It will only be offered when the additional checks can be implemented safely and described honestly. No payment is being collected now.",
  },
];

export default function PricingPage() {
  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent-dark">
            Simple pricing
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Free now. Honest about later.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted">
            The first phase is a free, focused audit. There is no checkout,
            subscription, or hidden paid feature. A Pro plan is planned, not
            available.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <section
            aria-labelledby="free-plan"
            className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-accent bg-white p-6 shadow-sm sm:p-8"
          >
            <div
              className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-accent-soft"
              aria-hidden="true"
            />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  Available today
                </p>
                <h2
                  id="free-plan"
                  className="mt-2 text-2xl font-bold tracking-tight text-ink"
                >
                  Free audit
                </h2>
              </div>
              <span className="rounded-full bg-accent px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white">
                Current
              </span>
            </div>

            <div className="mt-6 flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tight text-ink">
                $0
              </span>
              <span className="pb-1.5 text-sm text-muted">no card required</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              A real static HTML scan with clear boundaries, useful evidence,
              and practical next steps.
            </p>

            <ul className="mt-7 flex-1 space-y-3">
              {freeFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm leading-6 text-ink-soft"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-dark">
                    <Icon name="check" size={13} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <ButtonLink href="/audit" size="lg" className="mt-8 w-full">
              Run a free audit
              <Icon name="arrow-right" size={18} />
            </ButtonLink>
            <p className="mt-3 text-center text-xs text-muted">
              No account. No installation. No payment details.
            </p>
          </section>

          <section
            aria-labelledby="pro-plan"
            className="flex flex-col rounded-2xl border border-line bg-canvas p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Not available yet
                </p>
                <h2
                  id="pro-plan"
                  className="mt-2 text-2xl font-bold tracking-tight text-ink"
                >
                  Pro
                </h2>
              </div>
              <span className="rounded-full border border-line-strong bg-white px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-muted">
                Planned
              </span>
            </div>

            <div className="mt-6 flex items-end gap-2">
              <span className="text-3xl font-bold tracking-tight text-muted">
                Pricing TBD
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              A possible future plan for deeper, rendered-page and multi-page
              analysis. The scope below is a direction, not a promise of
              delivered features.
            </p>

            <ul className="mt-7 flex-1 space-y-3">
              {plannedFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm leading-6 text-muted"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-line-strong bg-white text-muted">
                    <Icon name="clock" size={12} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled
              className="mt-8 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-line-strong bg-white px-6 text-base font-semibold text-muted opacity-80"
            >
              Not available yet
            </button>
            <p className="mt-3 text-center text-xs text-muted">
              There is no waitlist or payment form in this version.
            </p>
          </section>
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-info/15 bg-info-soft p-5 text-sm leading-6 text-info">
          <Icon name="info" size={18} className="mt-0.5 shrink-0" />
          <p>
            We would rather ship a smaller free tool that tells the truth than
            charge for features that do not exist. Any future paid plan will be
            labelled clearly before a payment option is added.
          </p>
        </div>

        <section aria-labelledby="pricing-faq" className="mt-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Questions
            </p>
            <h2
              id="pricing-faq"
              className="mt-2 text-3xl font-bold tracking-tight text-ink"
            >
              The practical details
            </h2>
            <p className="mt-3 text-base leading-7 text-muted">
              If something is not implemented yet, it is not presented as a
              feature.
            </p>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-2">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-line bg-white p-5"
              >
                <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
                  <span className="flex items-start justify-between gap-4">
                    {faq.question}
                    <Icon
                      name="chevron-right"
                      size={17}
                      className="mt-1 shrink-0 text-muted transition-transform group-open:rotate-90"
                    />
                  </span>
                </summary>
                <p className="mt-3 border-t border-line pt-3 text-sm leading-6 text-muted">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <CtaBanner
        title="Use the free version while it is useful."
        description="Start with one public page. There is no account funnel waiting behind the button."
        primaryLabel="Audit a page now"
        secondaryLabel="Read the guides"
        secondaryHref="/blog"
      />
    </>
  );
}

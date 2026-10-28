import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/blog/article-card";
import { CtaBanner } from "@/components/cta-banner";
import { Icon } from "@/components/ui/icon";
import { blogPosts } from "@/content/blog-posts";

export const metadata: Metadata = {
  title: "Practical Shopify CRO guides",
  description:
    "Original, practical guides to Shopify product-page CRO, mobile UX, and checkout trust. Written for store owners and developers who want evidence-led improvements.",
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogPage() {
  const [featured, ...rest] = blogPosts;

  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent-dark">
              <Icon name="sparkles" size={14} />
              CRO field notes
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Practical Shopify CRO, without the theatre.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              Clear explanations of the product-page, mobile, and trust issues
              that affect real buying decisions. No invented statistics, no
              magic-button advice.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Start here
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">
              The essentials, in order
            </h2>
          </div>
          <p className="text-sm text-muted">
            {blogPosts.length} original guides · No CMS required
          </p>
        </div>

        <div className="mt-6">
          <ArticleCard post={featured} featured index={0} />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {rest.map((post, index) => (
            <ArticleCard key={post.slug} post={post} index={index + 1} />
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-dark">
              <Icon name="search" size={20} />
            </span>
            <div>
              <h2 className="font-semibold text-ink">
                Want to check a page while you read?
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
                Run a free static HTML audit in another tab. The report marks
                every limitation instead of guessing.
              </p>
            </div>
          </div>
          <Link
            href="/audit"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-line-strong bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-accent/50 hover:bg-accent-soft"
          >
            Open the audit
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </div>

      <CtaBanner
        title="Turn reading into one useful next step."
        description="Pick the page that matters most, run the free audit, and use the evidence to decide what to review first."
        primaryLabel="Audit a page"
        secondaryLabel="See how it works"
        secondaryHref="/pricing"
      />
    </>
  );
}

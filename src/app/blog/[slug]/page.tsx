import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/blog/article-card";
import {
  ArticleContent,
  getArticleHeadings,
} from "@/components/blog/article-content";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  blogPosts,
  getBlogPost,
  getRelatedPosts,
} from "@/content/blog-posts";
import { formatDate } from "@/lib/format";
import { siteConfig } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return { title: "Guide not found" };
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `${siteConfig.url}/blog/${post.slug}`,
      publishedTime: `${post.publishedAt}T00:00:00Z`,
      section: post.category,
    },
  };
}

export default async function BlogArticlePage({
  params,
}: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) notFound();

  const headings = getArticleHeadings(post.content);
  const relatedPosts = getRelatedPosts(post.slug);
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: `${post.publishedAt}T00:00:00Z`,
    dateModified: `${post.publishedAt}T00:00:00Z`,
    mainEntityOfPage: `${siteConfig.url}/blog/${post.slug}`,
    author: {
      "@type": "Organization",
      name: siteConfig.name,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c"),
        }}
      />
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <Icon name="arrow-right" size={15} className="rotate-180" />
        All guides
      </Link>

      <div className="mt-7 grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
        <article className="min-w-0">
          <header className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded-full border border-accent/15 bg-accent-soft px-2.5 py-1 font-semibold uppercase tracking-[0.12em] text-accent-dark">
                {post.category}
              </span>
              <time dateTime={post.publishedAt} className="text-muted">
                {formatDate(post.publishedAt)}
              </time>
              <span className="text-muted" aria-hidden="true">
                ·
              </span>
              <span className="text-muted">{post.readingTime}</span>
            </div>
            <h1 className="mt-5 text-3xl font-bold leading-[1.15] tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
              {post.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-ink-soft">
              {post.description}
            </p>
          </header>

          <details className="mt-7 rounded-xl border border-line bg-white p-4 lg:hidden">
            <summary className="cursor-pointer list-none text-sm font-semibold text-ink marker:hidden">
              <span className="flex items-center justify-between gap-3">
                In this guide
                <Icon name="chevron-right" size={17} className="text-muted" />
              </span>
            </summary>
            <nav aria-label="Article contents" className="mt-3 border-t border-line pt-3">
              <ol className="space-y-2">
                {headings.map((heading, index) => (
                  <li key={heading.id} className="flex gap-2 text-sm">
                    <span className="font-mono text-xs text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <a
                      href={`#${heading.id}`}
                      className="leading-6 text-ink-soft hover:text-accent-dark"
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </details>

          <div className="mt-9 max-w-3xl">
            <ArticleContent content={post.content} />
          </div>

          <div className="mt-10 max-w-3xl rounded-2xl border border-accent/20 bg-accent-soft p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-dark">
              Check the page, not just the theory
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-ink">
              Run a free static HTML audit.
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              See verifiable page signals with evidence and suggested fixes.
              Checks that need JavaScript, a real device, or human judgment are
              labelled clearly.
            </p>
            <ButtonLink href="/audit" size="sm" className="mt-4">
              Audit a page
              <Icon name="arrow-right" size={16} />
            </ButtonLink>
          </div>

          <p className="mt-6 max-w-3xl border-t border-line pt-6 text-xs leading-5 text-muted">
            This guide is educational and based on general usability and CRO
            principles. Test changes against your own customers, analytics, and
            store requirements. Shopify CRO Fixer is not affiliated with
            Shopify Inc.
          </p>
        </article>

        <aside className="hidden lg:sticky lg:top-28 lg:block">
          <div className="rounded-xl border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              In this guide
            </p>
            <nav aria-label="Article contents" className="mt-3">
              <ol className="space-y-2.5">
                {headings.map((heading, index) => (
                  <li key={heading.id} className="flex gap-2">
                    <span className="pt-0.5 font-mono text-[0.65rem] text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <a
                      href={`#${heading.id}`}
                      className="text-sm leading-5 text-ink-soft hover:text-accent-dark"
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
          <div className="mt-4 rounded-xl border border-line bg-canvas p-4">
            <p className="text-xs font-semibold text-ink">Keep it practical</p>
            <p className="mt-2 text-xs leading-5 text-muted">
              Choose one change, verify it on a real device, and give it enough
              time to produce a useful signal.
            </p>
          </div>
        </aside>
      </div>

      <section
        aria-labelledby="related-guides"
        className="mt-16 border-t border-line pt-10"
      >
        <h2
          id="related-guides"
          className="text-2xl font-bold tracking-tight text-ink"
        >
          Keep reading
        </h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {relatedPosts.map((related, index) => (
            <ArticleCard
              key={related.slug}
              post={related}
              index={index + 1}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

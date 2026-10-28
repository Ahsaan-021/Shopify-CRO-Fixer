import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatDate } from "@/lib/format";
import type { BlogPost } from "@/content/blog-posts";

type ArticleCardProps = {
  post: BlogPost;
  featured?: boolean;
  index?: number;
};

export function ArticleCard({
  post,
  featured = false,
  index = 0,
}: ArticleCardProps) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-colors hover:border-line-strong">
      <Link href={`/blog/${post.slug}`} className="block h-full">
        <div
          className={
            featured ? "md:grid md:grid-cols-[0.85fr_1.15fr]" : ""
          }
        >
          <div
            className={`relative overflow-hidden bg-ink p-6 text-white ${
              featured
                ? "flex min-h-56 flex-col justify-between md:min-h-full"
                : "h-36"
            }`}
          >
            <div
              className="dot-grid absolute inset-0 opacity-20"
              aria-hidden="true"
            />
            <div
              className="absolute -right-12 -top-12 size-44 rounded-full border border-white/10"
              aria-hidden="true"
            />
            <div className="relative flex items-center justify-between gap-3">
              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                {post.category}
              </span>
              <span className="font-mono text-xs text-white/35">
                0{(index % 9) + 1}
              </span>
            </div>
            {featured ? (
              <div className="relative mt-8">
                <p className="max-w-xs text-lg font-semibold leading-7 text-white/90">
                  Practical guidance for the page between interest and
                  checkout.
                </p>
                <Icon
                  name="arrow-right"
                  size={24}
                  className="mt-5 text-emerald-200 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                />
              </div>
            ) : null}
          </div>

          <div className={`p-6 ${featured ? "sm:p-8" : ""}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <time dateTime={post.publishedAt}>
                {formatDate(post.publishedAt)}
              </time>
              <span aria-hidden="true">·</span>
              <span>{post.readingTime}</span>
            </div>
            <h2
              className={`mt-3 font-bold tracking-tight text-ink ${
                featured ? "text-2xl sm:text-3xl" : "text-xl"
              }`}
            >
              {post.title}
            </h2>
            <p
              className={`mt-3 leading-7 text-muted ${
                featured ? "text-base" : "text-sm"
              }`}
            >
              {post.excerpt}
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-dark">
              Read guide
              <Icon
                name="arrow-right"
                size={16}
                className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
              />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

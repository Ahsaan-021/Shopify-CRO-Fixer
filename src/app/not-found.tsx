import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent-dark">
        <Icon name="search" size={26} />
      </span>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        404 · Page not found
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        This page is not on the shelf.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted">
        The link may be outdated, or the address may be mistyped. Try the
        homepage, run an audit, or browse the practical CRO guides.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/" size="lg">
          Back to home
          <Icon name="arrow-right" size={18} />
        </ButtonLink>
        <ButtonLink href="/audit" variant="secondary" size="lg">
          Run an audit
        </ButtonLink>
      </div>
      <p className="mt-6 text-sm text-muted">
        Looking for the blog?{" "}
        <Link
          href="/blog"
          className="font-medium text-accent-dark underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
        >
          Browse all guides
        </Link>
        .
      </p>
    </div>
  );
}

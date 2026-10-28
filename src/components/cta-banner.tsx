import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type CtaBannerProps = {
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function CtaBanner({
  title = "Start with one page. Fix what is actually there.",
  description = "Run a free static HTML audit, read the evidence, and choose the next change with more confidence.",
  primaryLabel = "Run a free audit",
  primaryHref = "/audit",
  secondaryLabel = "Read the CRO guides",
  secondaryHref = "/blog",
}: CtaBannerProps) {
  return (
    <section className="px-4 pb-16 pt-4 sm:px-6 sm:pb-20 lg:px-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-ink px-6 py-12 text-white sm:px-10 sm:py-14 lg:px-14">
        <div
          className="dot-grid absolute inset-0 opacity-25"
          aria-hidden="true"
        />
        <div
          className="absolute -right-24 -top-24 size-72 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-36 right-20 size-72 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Evidence first
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-7 text-white/70">
            {description}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={primaryHref} variant="inverse" size="lg">
              {primaryLabel}
              <Icon name="arrow-right" size={18} />
            </ButtonLink>
            <ButtonLink
              href={secondaryHref}
              variant="ghost"
              size="lg"
              className="border border-white/20 text-white hover:bg-white/10"
            >
              {secondaryLabel}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

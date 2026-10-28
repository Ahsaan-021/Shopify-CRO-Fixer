import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";

type FeatureCardProps = {
  icon: IconName;
  title: string;
  description: string;
  detail: string;
};

export function FeatureCard({
  icon,
  title,
  description,
  detail,
}: FeatureCardProps) {
  return (
    <article className="group rounded-2xl border border-line bg-white p-6 shadow-sm transition-colors hover:border-line-strong sm:p-7">
      <div className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent-dark">
        <Icon name={icon} size={22} />
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <p className="mt-5 border-t border-line pt-4 text-xs font-medium leading-5 text-ink-soft">
        {detail}
      </p>
    </article>
  );
}

import type {
  AuditCategory,
  AuditCheck,
  AuditEffort,
  AuditPriority,
  AuditSeverity,
  AuditSource,
} from "@/lib/audit/types";
import { Icon, type IconName } from "@/components/ui/icon";

const statusStyles: Record<
  AuditCheck["status"],
  {
    label: string;
    icon: IconName;
    badge: string;
    rail: string;
  }
> = {
  pass: {
    label: "Passed",
    icon: "check",
    badge: "border-accent/15 bg-accent-soft text-accent-dark",
    rail: "bg-accent",
  },
  warning: {
    label: "Warning",
    icon: "alert",
    badge: "border-warning/15 bg-warning-soft text-warning",
    rail: "bg-warning",
  },
  fail: {
    label: "Failed",
    icon: "x",
    badge: "border-danger/15 bg-danger-soft text-danger",
    rail: "bg-danger",
  },
  "not-checked": {
    label: "Unverified",
    icon: "info",
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    rail: "bg-slate-300",
  },
};

const categoryLabels: Record<AuditCategory, string> = {
  "above-fold": "Above the fold",
  "social-proof": "Social proof",
  offers: "Offers and pricing",
  "product-content": "Product content",
  content: "SEO and content",
  product: "Product data",
  mobile: "Mobile usability",
  trust: "Trust and guarantees",
  technical: "Technical hygiene",
};

const sourceLabels: Record<AuditSource, string> = {
  rendered: "Rendered mobile page",
  "static-html": "Static HTML",
  "product-json": "Shopify product JSON",
  pagespeed: "Google PageSpeed Insights",
};

const severityLabels: Record<
  Exclude<AuditSeverity, "none">,
  string
> = {
  high: "High severity",
  medium: "Medium severity",
  low: "Low severity",
  unknown: "Unverified",
};

const priorityLabels: Record<AuditPriority, string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

const priorityStyles: Record<AuditPriority, string> = {
  high: "border-danger/15 bg-danger-soft text-danger",
  medium: "border-warning/15 bg-warning-soft text-warning",
  low: "border-slate-200 bg-slate-100 text-slate-700",
};

const effortLabels: Record<AuditEffort, string> = {
  easy: "Easy effort",
  moderate: "Moderate effort",
  advanced: "Advanced effort",
};

type AuditFindingProps = {
  check: AuditCheck;
};

function StepList({
  steps,
  idPrefix,
}: {
  steps: string[];
  idPrefix: string;
}) {
  return (
    <ol className="mt-3 space-y-2">
      {steps.map((step, index) => (
        <li
          key={`${idPrefix}-step-${index}`}
          className="flex gap-2.5 text-sm leading-6 text-muted"
        >
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-[0.65rem] font-bold text-accent-dark">
            {index + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function AuditFinding({ check }: AuditFindingProps) {
  const style = statusStyles[check.status];
  const showFixLabel =
    check.status === "warning" || check.status === "fail"
      ? "How to fix in Shopify"
      : "How to verify";
  const recommendation =
    check.recommendation ??
    (check.status === "pass"
      ? "No change is needed based on this check. Confirm the same result in a rendered browser before publishing changes."
      : null);

  return (
    <article
      className="overflow-hidden rounded-xl border border-line bg-white"
      aria-labelledby={`check-${check.id}`}
    >
      <div className={`h-1 w-full ${style.rail}`} aria-hidden="true" />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
              {categoryLabels[check.category]}
              {check.source ? (
                <span className="font-medium normal-case tracking-normal text-muted/90">
                  {" "}
                  · {sourceLabels[check.source]}
                </span>
              ) : null}
            </p>
            <h4
              id={`check-${check.id}`}
              className="mt-1 text-base font-semibold text-ink"
            >
              {check.title}
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {check.severity !== "none" ? (
              <span className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[0.68rem] font-medium text-muted">
                {severityLabels[check.severity]}
              </span>
            ) : null}
            {check.priority ? (
              <span
                className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${priorityStyles[check.priority]}`}
              >
                {priorityLabels[check.priority]}
              </span>
            ) : null}
            {check.effort ? (
              <span className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[0.68rem] font-medium text-muted">
                {effortLabels[check.effort]}
              </span>
            ) : null}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${style.badge}`}
            >
              <Icon name={style.icon} size={13} />
              {style.label}
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-ink-soft">{check.summary}</p>

        {check.whyItMatters ? (
          <p className="mt-3 border-l-2 border-accent/30 pl-3 text-sm leading-6 text-muted">
            <span className="font-semibold text-ink-soft">
              Why it matters:{" "}
            </span>
            {check.whyItMatters}
          </p>
        ) : null}

        <div className="mt-4 rounded-lg border border-line bg-canvas/80 p-3.5">
          <h4 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
            Evidence
          </h4>
          <ul className="mt-2 space-y-1.5">
            {check.evidence.map((item, index) => (
              <li
                key={`${check.id}-evidence-${index}`}
                className="flex gap-2 text-xs leading-5 text-ink-soft"
              >
                <span className="mt-2 size-1 shrink-0 rounded-full bg-muted" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {check.fixTracks ? (
          <div className="mt-4 border-l-2 border-accent/35 pl-3">
            <h4 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-accent-dark">
              {showFixLabel}
            </h4>

            <div className="mt-3 rounded-lg border border-line bg-white p-3.5">
              <p className="text-xs font-semibold text-ink">
                For store owners
              </p>
              <StepList
                steps={check.fixTracks.storeOwner}
                idPrefix={`${check.id}-owner`}
              />
            </div>

            <div className="mt-3 rounded-lg border border-line bg-white p-3.5">
              <p className="text-xs font-semibold text-ink">
                For developers
              </p>
              <StepList
                steps={check.fixTracks.developer.steps}
                idPrefix={`${check.id}-developer`}
              />
              {check.fixTracks.developer.snippet ? (
                <div className="mt-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
                    {check.fixTracks.developer.snippet.label}
                  </p>
                  <pre className="mt-1.5 overflow-x-auto rounded-lg border border-line bg-ink px-3.5 py-3 text-xs leading-5 text-white">
                    <code>{check.fixTracks.developer.snippet.code}</code>
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        ) : recommendation ? (
          <div className="mt-4 border-l-2 border-accent/35 pl-3">
            <h4 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-accent-dark">
              {showFixLabel}
            </h4>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              {recommendation}
            </p>

            {check.fixSteps && check.fixSteps.length > 0 ? (
              <StepList steps={check.fixSteps} idPrefix={check.id} />
            ) : null}

            {check.snippet ? (
              <div className="mt-4">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
                  {check.snippet.label}
                </p>
                <pre className="mt-1.5 overflow-x-auto rounded-lg border border-line bg-ink px-3.5 py-3 text-xs leading-5 text-white">
                  <code>{check.snippet.code}</code>
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

/**
 * Compact one-line summary used for passed checks. Passed checks do not repeat
 * long "no change needed" paragraphs in the report.
 */
export function AuditFindingSummary({ check }: { check: AuditCheck }) {
  const style = statusStyles[check.status];

  return (
    <li className="flex items-start gap-2.5 border-b border-line/70 py-2.5 last:border-0">
      <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${style.badge}`}>
        <Icon name={style.icon} size={11} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-ink">
          {check.title}
          {check.source ? (
            <span className="font-normal text-muted">
              {" "}
              · {sourceLabels[check.source]}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs leading-5 text-muted">{check.summary}</p>
      </div>
    </li>
  );
}

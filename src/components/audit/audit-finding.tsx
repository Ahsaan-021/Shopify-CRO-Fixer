import type {
  AuditCategory,
  AuditCheck,
  AuditSeverity,
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
  content: "Content",
  product: "Product page",
  mobile: "Mobile",
  trust: "Trust",
  technical: "Technical",
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

type AuditFindingProps = {
  check: AuditCheck;
};

export function AuditFinding({ check }: AuditFindingProps) {
  const style = statusStyles[check.status];
  const showFixLabel =
    check.status === "warning" || check.status === "fail"
      ? "Suggested fix"
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
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${style.badge}`}
            >
              <Icon name={style.icon} size={13} />
              {style.label}
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-ink-soft">{check.summary}</p>

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

        {recommendation ? (
          <div className="mt-4 border-l-2 border-accent/35 pl-3">
            <h4 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-accent-dark">
              {showFixLabel}
            </h4>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              {recommendation}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

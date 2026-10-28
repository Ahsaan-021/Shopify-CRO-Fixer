import type {
  AuditCheck,
  AuditPriority,
  AuditReport,
  AuditVerdict,
} from "@/lib/audit/types";
import { AuditFinding } from "@/components/audit/audit-finding";
import {
  SpeedPanel,
  type SpeedPanelState,
} from "@/components/audit/speed-panel";
import { Icon, type IconName } from "@/components/ui/icon";

const verdictStyles: Record<
  AuditVerdict,
  {
    label: string;
    description: string;
    icon: IconName;
    panel: string;
    iconWrap: string;
  }
> = {
  "no-obvious-issues": {
    label: "No obvious HTML issues",
    description:
      "The limited set of checks run here found no clear problems. This is not proof that the page converts well.",
    icon: "check",
    panel: "border-accent/20 bg-accent-soft",
    iconWrap: "bg-accent text-white",
  },
  "needs-attention": {
    label: "Worth reviewing",
    description:
      "Some checks need attention. Start with the issues below, then verify each change in a browser.",
    icon: "alert",
    panel: "border-warning/20 bg-warning-soft",
    iconWrap: "bg-warning text-white",
  },
  "major-issues": {
    label: "Fix these first",
    description:
      "At least one high-impact or multiple lower-impact issues appeared in the scanned HTML. Treat them as leads to verify.",
    icon: "x",
    panel: "border-danger/20 bg-danger-soft",
    iconWrap: "bg-danger text-white",
  },
  limited: {
    label: "Limited result",
    description:
      "There was not enough verifiable information for a useful overall judgement. Review the checks individually.",
    icon: "info",
    panel: "border-info/20 bg-info-soft",
    iconWrap: "bg-info text-white",
  },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safeDisplayUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value;
  }
}

const severityOrder = ["high", "medium", "low"] as const;

const fixPriorityStyles: Record<AuditPriority, string> = {
  high: "border-danger/15 bg-danger-soft text-danger",
  medium: "border-warning/15 bg-warning-soft text-warning",
  low: "border-slate-200 bg-slate-100 text-slate-700",
};

const severityGroupMeta: Record<
  (typeof severityOrder)[number],
  { title: string; description: string; dot: string }
> = {
  high: {
    title: "High severity",
    description: "Address these before lower-impact polish.",
    dot: "bg-danger",
  },
  medium: {
    title: "Medium severity",
    description: "Worth reviewing next.",
    dot: "bg-warning",
  },
  low: {
    title: "Low severity",
    description: "Lower-impact improvements.",
    dot: "bg-slate-400",
  },
};

type CheckGroup = {
  id: string;
  title: string;
  description?: string;
  dot: string;
  checks: AuditCheck[];
};

function sortByStatus(a: AuditCheck, b: AuditCheck) {
  if (a.status === b.status) return 0;
  return a.status === "fail" ? -1 : 1;
}

/**
 * Builds the visible report groups. Severity groups contain only checks that
 * failed or produced a warning; passed and unverified checks get their own
 * sections so a missing check is never presented as a failure.
 */
function buildGroups(checks: AuditCheck[]): CheckGroup[] {
  const actionable = checks.filter(
    (check) => check.status === "fail" || check.status === "warning",
  );

  const groups: CheckGroup[] = severityOrder
    .map((severity) => ({
      id: `severity-${severity}`,
      title: severityGroupMeta[severity].title,
      description: severityGroupMeta[severity].description,
      dot: severityGroupMeta[severity].dot,
      checks: actionable
        .filter((check) => check.severity === severity)
        .sort(sortByStatus),
    }))
    .filter((group) => group.checks.length > 0);

  const other = actionable
    .filter(
      (check) =>
        !severityOrder.some((severity) => check.severity === severity),
    )
    .sort(sortByStatus);

  if (other.length > 0) {
    groups.push({
      id: "severity-other",
      title: "Other findings",
      dot: "bg-warning",
      checks: other,
    });
  }

  const unverified = checks.filter(
    (check) => check.status === "not-checked",
  );
  if (unverified.length > 0) {
    groups.push({
      id: "unverified",
      title: "Unverified",
      description: "These checks could not be completed from the available data.",
      dot: "bg-slate-400",
      checks: unverified,
    });
  }

  const passed = checks.filter((check) => check.status === "pass");
  if (passed.length > 0) {
    groups.push({
      id: "passed",
      title: "Passed checks",
      description: "Signals that were present in the response.",
      dot: "bg-accent",
      checks: passed,
    });
  }

  return groups;
}

export function AuditReportView({
  report,
  speedState,
}: {
  report: AuditReport;
  speedState: SpeedPanelState;
}) {
  const verdict = verdictStyles[report.verdict];
  const groups = buildGroups(report.checks);
  const scannedAt = new Date(report.scannedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const actionableCount = report.summary.failed + report.summary.warnings;

  return (
    <section aria-labelledby="audit-results-heading" className="space-y-5">
      <div className={`rounded-2xl border p-5 sm:p-6 ${verdict.panel}`}>
        <div className="flex items-start gap-4">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-full ${verdict.iconWrap}`}
          >
            <Icon name={verdict.icon} size={22} />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              <span>Live HTML + product scan</span>
              <span aria-hidden="true">·</span>
              <span>{report.pageType === "product" ? "Product page" : "General page"}</span>
            </p>
            <h2
              id="audit-results-heading"
              className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl"
            >
              {verdict.label}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {verdict.description}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { value: report.summary.passed, label: "Passed", color: "text-accent-dark" },
            { value: report.summary.warnings, label: "Warnings", color: "text-warning" },
            { value: report.summary.failed, label: "Failed", color: "text-danger" },
            {
              value: report.summary.notChecked,
              label: "Unverified",
              color: "text-slate-600",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/70 bg-white/70 px-3 py-3 text-center"
            >
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-info/15 bg-info-soft px-4 py-3.5 text-sm leading-6 text-info">
        <Icon name="info" size={17} className="mt-0.5 shrink-0" />
        <p>
          This report is based on the initial HTML returned for one public page,
          plus Shopify product JSON and Google PageSpeed data when available. It
          does not render JavaScript or test checkout. Verify findings in a real
          browser before changing production code.
        </p>
      </div>

      {report.fixPlan.length > 0 ? (
        <section
          aria-labelledby="fix-plan-heading"
          className="rounded-2xl border border-line bg-white p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-accent">
                Fix plan
              </p>
              <h2
                id="fix-plan-heading"
                className="mt-1 text-xl font-bold tracking-tight text-ink"
              >
                Start here
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                The top actions in rule-based priority order. This is editorial
                prioritisation, not a predicted conversion lift.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-muted">
              {report.fixPlan.length} action
              {report.fixPlan.length === 1 ? "" : "s"}
            </span>
          </div>

          <ol className="mt-4 space-y-2.5">
            {report.fixPlan.map((item, index) => (
              <li
                key={item.checkId}
                className="rounded-xl border border-line bg-canvas/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <a
                        href={`#check-${item.checkId}`}
                        className="text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent"
                      >
                        {item.title}
                      </a>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {item.summary}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold capitalize ${fixPriorityStyles[item.priority]}`}
                    >
                      {item.priority} priority
                    </span>
                    <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[0.65rem] font-medium capitalize text-muted">
                      {item.effort} effort
                    </span>
                  </div>
                </div>
                <a
                  href={`#check-${item.checkId}`}
                  className="mt-2 inline-flex items-center gap-1 text-[0.7rem] font-semibold text-accent-dark underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
                >
                  See full steps
                  <Icon name="arrow-right" size={13} />
                </a>
              </li>
            ))}
          </ol>

          <p className="mt-4 text-xs leading-5 text-muted">
            Priority rule: a failed high/medium-severity check is High; a failed
            low-severity check or a high/medium-severity warning is Medium; a
            low-severity warning is Low. Effort is an editorial estimate. No
            revenue or conversion estimates are produced.
          </p>
        </section>
      ) : null}

      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
              Scanned page
            </p>
            <a
              href={report.finalUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-1 block truncate text-sm font-semibold text-accent-dark underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
              title={report.finalUrl}
            >
              {safeDisplayUrl(report.finalUrl)}
            </a>
            <p className="mt-2 text-xs leading-5 text-muted">
              {report.document.title
                ? `Page title: “${report.document.title}”`
                : "No page title was available."}
            </p>
            {report.document.canonicalUrl ? (
              <p
                className="mt-1 truncate text-xs leading-5 text-muted"
                title={report.document.canonicalUrl}
              >
                Canonical: {safeDisplayUrl(report.document.canonicalUrl)}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-left text-xs leading-5 text-muted sm:text-right">
            <p>{scannedAt} (your local time)</p>
            <p>
              HTTP {report.httpStatus} · {formatBytes(report.document.bytes)} HTML
            </p>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          <div>
            <dt className="font-semibold uppercase tracking-wide text-muted">
              Requested URL
            </dt>
            <dd className="mt-1 break-all text-ink-soft">
              {safeDisplayUrl(report.requestedUrl)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-muted">
              Redirects followed
            </dt>
            <dd className="mt-1 text-ink-soft">{report.redirects.length}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-muted">
              Detected page signals
            </dt>
            <dd className="mt-1 text-ink-soft">
              {report.pageTypeEvidence}
              <span className="mt-1 block text-xs text-muted">
                Signals only, not confirmed Shopify identification.
              </span>
            </dd>
          </div>
        </dl>

        {report.redirects.length > 0 ? (
          <div className="mt-4 rounded-lg border border-line bg-canvas p-3 text-xs leading-5 text-muted">
            <p className="font-semibold text-ink-soft">Redirect chain revalidated:</p>
            <ol className="mt-1 space-y-1">
              {report.redirects.map((redirect) => (
                <li key={`${redirect.status}-${redirect.to}`}>
                  HTTP {redirect.status} → {safeDisplayUrl(redirect.to)}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="mt-4 rounded-lg border border-line bg-canvas p-3 text-xs leading-5 text-muted">
          <p className="font-semibold text-ink-soft">Shopify product JSON</p>
          <p className="mt-1">
            {report.productJson.status === "checked"
              ? "Read successfully. The product checks below use this real product data."
              : report.productJson.reason}
          </p>
        </div>
      </div>

      <SpeedPanel state={speedState} />

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink">
              Findings in detail
            </h2>
            <p className="mt-1 text-sm text-muted">
              Grouped by severity. Unverified checks are not failures.
            </p>
          </div>
          <span className="text-xs font-medium text-muted">
            {report.checks.length} checks
          </span>
        </div>

        {actionableCount === 0 ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-accent/20 bg-accent-soft px-4 py-3.5 text-sm leading-6 text-ink-soft">
            <Icon
              name="check"
              size={17}
              className="mt-0.5 shrink-0 text-accent-dark"
            />
            <p>
              <span className="font-semibold text-ink">
                No failed or warning-level findings were detected.
              </span>{" "}
              Review the unverified checks and verify the page in a browser
              before treating it as fully optimised.
            </p>
          </div>
        ) : null}

        <div className="mt-6 space-y-7">
          {groups.map((group) => (
            <section
              key={group.id}
              aria-labelledby={`group-${group.id}`}
            >
              <div className="mb-3 flex items-start justify-between gap-4 px-1">
                <div>
                  <h3
                    id={`group-${group.id}`}
                    className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-ink-soft"
                  >
                    <span
                      className={`size-2 rounded-full ${group.dot}`}
                      aria-hidden="true"
                    />
                    {group.title}
                  </h3>
                  {group.description ? (
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {group.description}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium text-muted">
                  {group.checks.length}
                </span>
              </div>
              <div className="space-y-3">
                {group.checks.map((check) => (
                  <AuditFinding key={check.id} check={check} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <details className="group rounded-xl border border-line bg-white p-5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-ink marker:hidden">
          <span className="flex items-center justify-between gap-4">
            What this audit does not cover
            <Icon
              name="chevron-right"
              size={17}
              className="shrink-0 text-muted transition-transform group-open:rotate-90"
            />
          </span>
        </summary>
        <ul className="mt-4 space-y-2 border-t border-line pt-4">
          {report.limitations.map((limitation) => (
            <li
              key={limitation}
              className="flex gap-2 text-sm leading-6 text-muted"
            >
              <span className="mt-2.5 size-1 shrink-0 rounded-full bg-muted" aria-hidden="true" />
              {limitation}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

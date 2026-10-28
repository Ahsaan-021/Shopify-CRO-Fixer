import type { SpeedData, SpeedOpportunity } from "@/lib/audit/types";
import { Icon } from "@/components/ui/icon";

export type SpeedPanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: SpeedData }
  | { status: "unavailable"; message: string };

function formatMs(value: number | null) {
  if (value === null) return "Not returned";
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${Math.round(value)} ms`;
}

function formatCls(value: number | null) {
  return value === null ? "Not returned" : value.toFixed(3);
}

function formatFetchedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function OpportunityList({
  title,
  items,
  empty,
}: {
  title: string;
  items: SpeedOpportunity[];
  empty: string;
}) {
  return (
    <div>
      <h4 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="mt-2 text-xs leading-5 text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li
              key={`${title}-${item.title}`}
              className="rounded-lg border border-line bg-canvas/80 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-ink-soft">
                  {item.title}
                </p>
                {item.displayValue ? (
                  <span className="shrink-0 rounded-full border border-line bg-white px-2 py-0.5 text-[0.65rem] font-medium text-muted">
                    {item.displayValue}
                  </span>
                ) : null}
              </div>
              {item.description ? (
                <p className="mt-1 text-xs leading-5 text-muted">
                  {item.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SpeedPanel({ state }: { state: SpeedPanelState }) {
  if (state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <section
        aria-labelledby="speed-heading"
        className="rounded-2xl border border-line bg-white p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 size-5 shrink-0 animate-spin rounded-full border-2 border-accent-soft border-t-accent motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div>
            <h2
              id="speed-heading"
              className="text-lg font-bold tracking-tight text-ink"
            >
              Measuring mobile speed
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Asking Google PageSpeed Insights for lab data. Heavy pages can
              take up to two minutes, and the rest of the report is already
              available.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (state.status === "unavailable") {
    return (
      <section
        aria-labelledby="speed-heading"
        className="rounded-2xl border border-line bg-white p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-canvas text-muted">
            <Icon name="info" size={18} />
          </span>
          <div>
            <h2
              id="speed-heading"
              className="text-lg font-bold tracking-tight text-ink"
            >
              Speed data unavailable
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              {state.message}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              The HTML and product findings elsewhere in this report are
              unaffected. No speed numbers are shown unless Google returns
              them.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const data = state.data;

  return (
    <section
      aria-labelledby="speed-heading"
      className="rounded-2xl border border-line bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
            Speed and Core Web Vitals
          </p>
          <h2
            id="speed-heading"
            className="mt-1 text-lg font-bold tracking-tight text-ink"
          >
            Mobile lab data
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Source: {data.source} · strategy: mobile
          </p>
        </div>
        <p className="shrink-0 text-xs leading-5 text-muted sm:text-right">
          Fetched {formatFetchedAt(data.fetchedAt)}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-xl border border-line bg-canvas p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
            Google performance score
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-ink">
            {data.performanceScore === null
              ? "Not returned"
              : `${data.performanceScore} / 100`}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">
            This is Google&apos;s mobile lab score, not a conversion score and
            not this audit&apos;s score.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "LCP", value: formatMs(data.lcpMs), note: "Largest Contentful Paint" },
            { label: "CLS", value: formatCls(data.cls), note: "Cumulative Layout Shift" },
            { label: "TBT", value: formatMs(data.tbtMs), note: "Total Blocking Time" },
            { label: "INP", value: formatMs(data.inpMs), note: "Interaction to Next Paint" },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-line bg-canvas/80 px-3 py-3"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
                {metric.label}
              </p>
              <p className="mt-1 text-base font-bold text-ink">
                {metric.value}
              </p>
              <p className="mt-0.5 text-[0.65rem] leading-4 text-muted">
                {metric.note}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
        <OpportunityList
          title="Top opportunities"
          items={data.opportunities}
          empty="Google returned no opportunity details for this page."
        />
        <OpportunityList
          title="Diagnostics"
          items={data.diagnostics}
          empty="Google returned no diagnostic details for this page."
        />
      </div>

      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted">
        <Icon name="info" size={15} className="mt-0.5 shrink-0 text-info" />
        <span>
          Lab data is measured under Google&apos;s test conditions. It can differ
          from real shoppers&apos; devices and networks, and it does not predict
          conversion lift.
        </span>
      </p>
    </section>
  );
}

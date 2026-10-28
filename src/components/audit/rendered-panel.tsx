import type {
  RenderedAudit,
  RenderedLocation,
  RenderedSignal,
  RenderedSignalGroup,
} from "@/lib/audit/types";
import { Icon } from "@/components/ui/icon";

export type RenderedPanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: RenderedAudit }
  | { status: "unavailable"; message: string };

const signalGroupLabels: Record<RenderedSignalGroup, string> = {
  trust: "Trust and guarantees",
  "shipping-returns": "Shipping and returns",
  "social-proof": "Social proof",
  offers: "Offers and pricing",
  urgency: "Urgency and scarcity",
  "product-content": "Product content",
  support: "Support",
  "accelerated-checkout": "Accelerated checkout",
};

const locationLabels: Record<RenderedLocation, string> = {
  "above-fold": "above the fold",
  "near-buy-box": "near the buy box",
  "below-fold": "below the fold",
  "footer-only": "footer only",
  "page-wide": "page-wide / app script",
  "not-found": "not found",
};

function statusLabel(signal: RenderedSignal) {
  if (signal.status === "detected") return "Detected";
  if (signal.status === "unable") return "Unable to verify";
  return "Not detected";
}

function statusClass(signal: RenderedSignal) {
  if (signal.status === "detected") {
    return "border-accent/15 bg-accent-soft text-accent-dark";
  }
  if (signal.status === "unable") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  return "border-warning/15 bg-warning-soft text-warning";
}

function formatScanDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-accent-dark"
      : tone === "warn"
        ? "text-warning"
        : "text-ink";

  return (
    <div className="rounded-lg border border-line bg-canvas/70 px-3 py-2.5">
      <dt className="text-[0.62rem] font-semibold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className={`mt-1 text-xs font-semibold leading-5 ${toneClass}`}>
        {value}
      </dd>
    </div>
  );
}

function SignalList({ signals }: { signals: RenderedSignal[] }) {
  return (
    <ul className="space-y-1.5">
      {signals.map((signal) => (
        <li
          key={signal.id}
          className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink">{signal.label}</p>
            <p className="mt-0.5 break-words text-[0.7rem] leading-4 text-muted">
              {signal.evidence}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[0.6rem] font-medium text-muted">
              {locationLabels[signal.location]}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold ${statusClass(signal)}`}
            >
              {statusLabel(signal)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RenderedPanel({ state }: { state: RenderedPanelState }) {
  if (state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <section
        aria-labelledby="rendered-panel-heading"
        className="rounded-2xl border border-line bg-white p-5 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <span
            className="size-5 shrink-0 animate-spin rounded-full border-2 border-accent-soft border-t-accent motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div>
            <h2
              id="rendered-panel-heading"
              className="text-lg font-bold tracking-tight text-ink"
            >
              Rendering the mobile page…
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted" role="status">
              Loading the page in an isolated browser at 390 × 844, then
              measuring what a shopper can actually see. Static results are
              already available above.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (state.status === "unavailable") {
    return (
      <section
        aria-labelledby="rendered-panel-heading"
        className="rounded-2xl border border-line bg-white p-5 sm:p-6"
      >
        <h2
          id="rendered-panel-heading"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink"
        >
          <Icon name="info" size={19} className="text-info" />
          Rendered mobile audit not available
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{state.message}</p>
        <p className="mt-2 text-xs leading-5 text-muted">
          These checks were not run: above-the-fold layout, tap-target size,
          sticky add-to-cart, image and video count, variant preselection,
          discount badge, horizontal overflow, popup coverage, mobile
          screenshot, and rendered ecommerce signals. The static HTML and
          product JSON findings are unaffected.
        </p>
      </section>
    );
  }

  const { data } = state;
  const metrics = data.metrics;
  const groups = Object.entries(signalGroupLabels) as Array<
    [RenderedSignalGroup, string]
  >;

  const atcSize = metrics.addToCartRect
    ? `${metrics.addToCartRect.width} × ${metrics.addToCartRect.height}px`
    : "not found";
  const tapTargetOk = Boolean(
    metrics.addToCartRect &&
      metrics.addToCartRect.width >= 44 &&
      metrics.addToCartRect.height >= 44,
  );

  return (
    <section
      aria-labelledby="rendered-panel-heading"
      className="rounded-2xl border border-line bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-accent">
            Rendered mobile page
          </p>
          <h2
            id="rendered-panel-heading"
            className="mt-1 text-xl font-bold tracking-tight text-ink"
          >
            What a shopper sees
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Headless Chromium, mobile viewport 390 × 844, mobile user agent.
            Automated detection is heuristic; confirm important findings in a
            real browser.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-muted">
          {formatScanDuration(data.durationMs)} render
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        {data.screenshot ? (
          <figure className="overflow-hidden rounded-xl border border-line bg-canvas">
            {/* The screenshot is returned as an in-memory base64 data URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:${data.screenshot.mime};base64,${data.screenshot.base64}`}
              alt="First mobile screen of the scanned product page"
              width={data.screenshot.width}
              height={data.screenshot.height}
              className="h-auto w-full"
            />
            <figcaption className="border-t border-line px-3 py-2 text-[0.65rem] leading-4 text-muted">
              First screen only · {data.screenshot.width} ×{" "}
              {data.screenshot.height} ·{" "}
              {(data.screenshot.bytes / 1024).toFixed(0)} KB
            </figcaption>
          </figure>
        ) : (
          <div className="rounded-xl border border-line bg-canvas p-4 text-xs leading-5 text-muted">
            The first-screen screenshot was skipped because it could not be
            kept small enough for a safe response. Measurements below are still
            real.
          </div>
        )}

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Metric
            label="Title above fold"
            value={metrics.titleAboveFold ? "Yes" : "No"}
            tone={metrics.titleAboveFold ? "good" : "warn"}
          />
          <Metric
            label="Price above fold"
            value={metrics.priceAboveFold ? "Yes" : "No"}
            tone={metrics.priceAboveFold ? "good" : "warn"}
          />
          <Metric
            label="Add to cart above fold"
            value={metrics.addToCartAboveFold ? "Yes" : "No"}
            tone={metrics.addToCartAboveFold ? "good" : "warn"}
          />
          <Metric
            label="Add-to-cart size"
            value={atcSize}
            tone={tapTargetOk ? "good" : "warn"}
          />
          <Metric
            label="Sticky add to cart"
            value={metrics.stickyAddToCartDetected ? "Detected" : "Not detected"}
            tone={metrics.stickyAddToCartDetected ? "good" : "default"}
          />
          <Metric
            label="Product images"
            value={`${metrics.productImageCount} (${metrics.productImagesWithAlt} with alt)`}
            tone={metrics.productImageCount >= 4 ? "good" : "warn"}
          />
          <Metric
            label="Video"
            value={metrics.videoDetected ? "Detected" : "Not detected"}
          />
          <Metric
            label="Variants"
            value={
              metrics.variantSelectorDetected
                ? metrics.variantPreselected === false
                  ? "Found, none preselected"
                  : "Found, preselected"
                : "Not found"
            }
          />
          <Metric
            label="Compare-at / badge"
            value={
              metrics.discountBadgeDetected
                ? metrics.discountBadgeText ?? "Discount detected"
                : metrics.compareAtText
                  ? `Compare-at: ${metrics.compareAtText}`
                  : "Not detected"
            }
          />
          <Metric
            label="Horizontal overflow"
            value={
              metrics.horizontalOverflow
                ? `${metrics.scrollWidth}px wide`
                : "None at 390px"
            }
            tone={metrics.horizontalOverflow ? "warn" : "good"}
          />
          <Metric
            label="Popup coverage"
            value={`${Math.round(metrics.overlayCoverage * 100)}% of first screen`}
            tone={
              metrics.overlayCoverage > 0.25
                ? "warn"
                : metrics.overlayCoverage > 0.1
                  ? "warn"
                  : "good"
            }
          />
          <Metric
            label="Page height"
            value={`${metrics.pageHeight}px`}
          />
        </dl>
      </div>

      <div className="mt-5 rounded-lg border border-info/15 bg-info-soft px-3.5 py-3 text-xs leading-5 text-info">
        <p className="font-semibold">
          Detected / Not detected / Unable to verify
        </p>
        <p className="mt-1">
          &ldquo;Not detected&rdquo; means the signal was not found in the
          rendered page. It does not prove the feature does not exist, because
          apps, the selected variant, region, or login state can change what is
          shown. Location is approximate.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {groups.map(([group, label]) => {
          const signals = data.signals.filter(
            (signal) => signal.group === group,
          );
          if (signals.length === 0) return null;

          return (
            <div key={group}>
              <h3 className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                {label}
              </h3>
              <SignalList signals={signals} />
            </div>
          );
        })}
      </div>

      <details className="group mt-5 rounded-lg border border-line bg-canvas p-4">
        <summary className="cursor-pointer list-none text-xs font-semibold text-ink marker:hidden">
          <span className="flex items-center justify-between gap-3">
            Rendered-audit limitations
            <Icon
              name="chevron-right"
              size={15}
              className="shrink-0 text-muted transition-transform group-open:rotate-90"
            />
          </span>
        </summary>
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
          {data.limitations.map((limitation) => (
            <li
              key={limitation}
              className="flex gap-2 text-[0.7rem] leading-5 text-muted"
            >
              <span
                className="mt-2 size-1 shrink-0 rounded-full bg-muted"
                aria-hidden="true"
              />
              {limitation}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

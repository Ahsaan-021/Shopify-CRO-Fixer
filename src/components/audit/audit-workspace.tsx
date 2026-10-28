"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { AuditReportView } from "@/components/audit/audit-report";
import type { RenderedPanelState } from "@/components/audit/rendered-panel";
import type { SpeedPanelState } from "@/components/audit/speed-panel";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  failureFromApi,
  failureFromNetwork,
  timeoutFailure,
  unexpectedResponseFailure,
  type AuditFailure,
} from "@/lib/audit/client-errors";
import type {
  AuditReport,
  RenderedResult,
  SpeedResult,
} from "@/lib/audit/types";
import { validateAuditUrl } from "@/lib/audit/validation";

type AuditWorkspaceProps = {
  initialUrl?: string;
};

const CLIENT_TIMEOUT_MS = 25_000;
const SPEED_CLIENT_TIMEOUT_MS = 110_000;
const RENDER_CLIENT_TIMEOUT_MS = 50_000;

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function isAuditReport(value: unknown): value is AuditReport {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AuditReport>;
  return (
    candidate.mode === "live" &&
    Array.isArray(candidate.checks) &&
    typeof candidate.finalUrl === "string" &&
    typeof candidate.summary === "object"
  );
}

function isSpeedResult(value: unknown): value is SpeedResult {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as {
    status?: unknown;
    data?: unknown;
    message?: unknown;
  };

  if (candidate.status === "unavailable") {
    return typeof candidate.message === "string";
  }

  if (
    candidate.status !== "ok" ||
    typeof candidate.data !== "object" ||
    candidate.data === null
  ) {
    return false;
  }

  const data = candidate.data as Record<string, unknown>;
  return (
    typeof data.source === "string" &&
    Array.isArray(data.opportunities) &&
    Array.isArray(data.diagnostics) &&
    (data.performanceScore === null ||
      typeof data.performanceScore === "number") &&
    (data.lcpMs === null || typeof data.lcpMs === "number") &&
    (data.cls === null || typeof data.cls === "number") &&
    (data.tbtMs === null || typeof data.tbtMs === "number") &&
    (data.inpMs === null || typeof data.inpMs === "number")
  );
}

function isRenderedResult(value: unknown): value is RenderedResult {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as {
    status?: unknown;
    message?: unknown;
    data?: unknown;
  };

  if (candidate.status === "unavailable") {
    return typeof candidate.message === "string";
  }

  if (candidate.status !== "ok" || typeof candidate.data !== "object" || candidate.data === null) {
    return false;
  }

  const data = candidate.data as Record<string, unknown>;
  return (
    Array.isArray(data.checks) &&
    Array.isArray(data.signals) &&
    Array.isArray(data.limitations) &&
    typeof data.metrics === "object" &&
    data.metrics !== null &&
    (data.screenshot === null || typeof data.screenshot === "object")
  );
}

export function AuditWorkspace({ initialUrl = "" }: AuditWorkspaceProps) {
  const inputId = useId();
  const helperId = useId();
  const errorId = useId();
  const [url, setUrl] = useState(initialUrl);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [failure, setFailure] = useState<AuditFailure | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [speedState, setSpeedState] = useState<SpeedPanelState>({
    status: "idle",
  });
  const [renderedState, setRenderedState] = useState<RenderedPanelState>({
    status: "idle",
  });
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const speedAbortRef = useRef<AbortController | null>(null);
  const renderAbortRef = useRef<AbortController | null>(null);
  const autoRunRef = useRef(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const loadSpeed = useCallback(async (finalUrl: string) => {
    speedAbortRef.current?.abort();
    const controller = new AbortController();
    speedAbortRef.current = controller;
    setSpeedState({ status: "loading" });

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, SPEED_CLIENT_TIMEOUT_MS);

    const isCurrent = () => speedAbortRef.current === controller;

    try {
      const response = await fetch("/api/speed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finalUrl }),
        signal: controller.signal,
        cache: "no-store",
      });

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!isCurrent()) return;

      if (!response.ok) {
        setSpeedState({
          status: "unavailable",
          message: failureFromApi(response.status, payload).message,
        });
        return;
      }

      if (!isSpeedResult(payload)) {
        setSpeedState({
          status: "unavailable",
          message: "Speed data unavailable (unexpected response).",
        });
        return;
      }

      if (payload.status === "ok") {
        setSpeedState({ status: "ok", data: payload.data });
      } else {
        setSpeedState({
          status: "unavailable",
          message: payload.message,
        });
      }
    } catch (error) {
      if (!isCurrent()) return;

      if (isAbortError(error)) {
        setSpeedState({
          status: "unavailable",
          message: "Speed data unavailable (quota or timeout).",
        });
        return;
      }

      setSpeedState({
        status: "unavailable",
        message: "Speed data unavailable (network error).",
      });
    } finally {
      clearTimeout(timeoutId);
      if (speedAbortRef.current === controller) {
        speedAbortRef.current = null;
      }
    }
  }, []);

  const loadRendered = useCallback(async (finalUrl: string) => {
    renderAbortRef.current?.abort();
    const controller = new AbortController();
    renderAbortRef.current = controller;
    setRenderedState({ status: "loading" });

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, RENDER_CLIENT_TIMEOUT_MS);

    const isCurrent = () => renderAbortRef.current === controller;

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finalUrl }),
        signal: controller.signal,
        cache: "no-store",
      });

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!isCurrent()) return;

      if (!response.ok) {
        setRenderedState({
          status: "unavailable",
          message: failureFromApi(response.status, payload).message,
        });
        return;
      }

      if (!isRenderedResult(payload)) {
        setRenderedState({
          status: "unavailable",
          message:
            "The rendered audit returned an unexpected response. Static findings are still shown.",
        });
        return;
      }

      if (payload.status === "ok") {
        setRenderedState({ status: "ok", data: payload.data });
      } else {
        setRenderedState({
          status: "unavailable",
          message: payload.message,
        });
      }
    } catch (error) {
      if (!isCurrent()) return;

      if (isAbortError(error)) {
        setRenderedState({
          status: "unavailable",
          message:
            "The rendered scan timed out. Static HTML and product JSON findings are still shown.",
        });
        return;
      }

      setRenderedState({
        status: "unavailable",
        message:
          "The rendered scan could not be reached. Static HTML and product JSON findings are still shown.",
      });
    } finally {
      clearTimeout(timeoutId);
      if (renderAbortRef.current === controller) {
        renderAbortRef.current = null;
      }
    }
  }, []);

  const runAudit = useCallback(async (candidate: string) => {
    const validation = validateAuditUrl(candidate);

    if (!validation.ok) {
      setFieldError(validation.message);
      setFailure(null);
      return;
    }

    setFieldError(null);
    setFailure(null);
    setReport(null);
    setSpeedState({ status: "idle" });
    setRenderedState({ status: "idle" });
    speedAbortRef.current?.abort();
    speedAbortRef.current = null;
    renderAbortRef.current?.abort();
    renderAbortRef.current = null;
    setIsLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CLIENT_TIMEOUT_MS);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: validation.url }),
        signal: controller.signal,
        cache: "no-store",
      });

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        setFailure(failureFromApi(response.status, payload));
        return;
      }

      if (!isAuditReport(payload)) {
        setFailure(unexpectedResponseFailure());
        return;
      }

      setReport(payload);
      void loadSpeed(payload.finalUrl);
      void loadRendered(payload.finalUrl);
      requestAnimationFrame(() => {
        resultsRef.current?.focus();
      });
    } catch (error) {
      if (isAbortError(error)) {
        if (timedOut) setFailure(timeoutFailure());
        return;
      }

      setFailure(failureFromNetwork(error));
    } finally {
      clearTimeout(timeoutId);

      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsLoading(false);
      }
    }
  }, [loadSpeed, loadRendered]);

  useEffect(() => {
    if (!initialUrl || autoRunRef.current) return;
    autoRunRef.current = true;
    void runAudit(initialUrl);

    return () => {
      autoRunRef.current = false;
      abortRef.current?.abort();
      speedAbortRef.current?.abort();
      renderAbortRef.current?.abort();
    };
  }, [initialUrl, runAudit]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAudit(url);
  }

  const isBusy = isLoading;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
      <div className="lg:sticky lg:top-28">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6"
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-accent">
            Audit a page
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-ink">
            Enter a public Shopify URL
          </h2>
          <p id={helperId} className="mt-2 text-sm leading-6 text-muted">
            Use a direct product page for product-specific checks. The scan reads
            the public HTML first, then renders the mobile page in an isolated
            browser.
          </p>

          <div className="mt-5">
            <label
              htmlFor={inputId}
              className="mb-2 block text-sm font-semibold text-ink"
            >
              Store or product page URL
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted"
                aria-hidden="true"
              >
                <Icon name="search" size={18} />
              </span>
              <input
                id={inputId}
                name="url"
                type="text"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                value={url}
                disabled={isBusy}
                onChange={(event) => {
                  setUrl(event.target.value);
                  if (fieldError) setFieldError(null);
                }}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? `${helperId} ${errorId}` : helperId}
                placeholder="your-store.com/products/your-product"
                className={`h-12 w-full rounded-xl border bg-white py-3 pl-10 pr-3.5 text-base text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent disabled:bg-canvas disabled:text-muted ${
                  fieldError ? "border-danger" : "border-line-strong"
                }`}
              />
            </div>
            {fieldError ? (
              <p
                id={errorId}
                role="alert"
                className="mt-2 flex items-start gap-1.5 text-sm font-medium text-danger"
              >
                <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
                {fieldError}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isBusy}
            className="mt-4 w-full"
          >
            {isBusy ? (
              <>
                <span
                  className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Analyzing…
              </>
            ) : (
              <>
                Analyze store
                <Icon name="arrow-right" size={18} />
              </>
            )}
          </Button>

          <div className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-xs leading-5 text-muted">
            <Icon name="shield" size={15} className="mt-0.5 shrink-0 text-accent" />
            <p>
              Private, loopback, and internal addresses are rejected. Free
              scans are rate-limited.
            </p>
          </div>
        </form>

        <div className="mt-4 rounded-2xl border border-line bg-canvas p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Icon name="clock" size={17} className="text-accent" />
            What happens during a scan
          </p>
          <ul className="mt-3 space-y-2.5 text-xs leading-5 text-muted">
            <li className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              The domain is resolved and checked before any connection.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              Redirects are limited and each new destination is revalidated.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              The public HTML is read first, then a separate mobile render runs
              so a slow page cannot break the static report.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              The rendered browser uses a mobile viewport and an allow-listing
              proxy. Private addresses, files, uploads, and websockets are
              blocked.
            </li>
          </ul>
        </div>
      </div>

      <div
        ref={resultsRef}
        tabIndex={-1}
        className="min-w-0 outline-none"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <p className="sr-only" role="status">
              Audit in progress. Please wait.
            </p>
            <div className="flex items-center gap-4">
              <span
                className="size-11 shrink-0 animate-spin rounded-full border-[3px] border-accent-soft border-t-accent motion-reduce:animate-none"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-xl font-bold tracking-tight text-ink">
                  Scanning the public HTML…
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Validating the destination, following safe redirects, checking
                  the response, and reading public product data when available.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-3" aria-hidden="true">
              {[80, 64, 72, 54].map((width, index) => (
                <div
                  key={width}
                  className="rounded-xl border border-line p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div
                      className="h-3 rounded bg-line"
                      style={{ width: `${width}%` }}
                    />
                    <div className="h-5 w-16 rounded-full bg-line/70" />
                  </div>
                  <div className="mt-3 h-2.5 w-full rounded bg-line/50" />
                  <div className="mt-2 h-2.5 w-4/5 rounded bg-line/40" />
                  {index === 0 ? (
                    <div className="mt-4 h-10 w-full rounded-lg bg-canvas" />
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-muted">
              Most scans finish in a few seconds. The request will stop
              automatically if the page is too slow or too large.
            </p>
          </div>
        ) : failure ? (
          <div
            role="alert"
            className="rounded-2xl border border-danger/20 bg-white p-6 shadow-sm sm:p-8"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-danger-soft text-danger">
              <Icon name="alert" size={22} />
            </span>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-ink">
              {failure.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {failure.message}
            </p>
            <div className="mt-5 rounded-xl border border-line bg-canvas p-4 text-xs leading-5 text-muted">
              <p className="font-semibold text-ink-soft">What to try</p>
              <p className="mt-1">{failure.hint}</p>
            </div>
            <p className="mt-3 font-mono text-[0.68rem] uppercase tracking-wide text-muted">
              Error code: {failure.code}
              {failure.upstreamStatus
                ? ` · site response HTTP ${failure.upstreamStatus}`
                : failure.serviceStatus
                  ? ` · audit service HTTP ${failure.serviceStatus}`
                  : ""}
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-5"
              onClick={() => void runAudit(url)}
            >
              Try this audit again
              <Icon name="arrow-right" size={17} />
            </Button>
          </div>
        ) : report ? (
          <>
            <p className="sr-only" role="status">
              Audit complete. Results are ready.
            </p>
            <AuditReportView
              report={report}
              speedState={speedState}
              renderedState={renderedState}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent-dark">
              <Icon name="search" size={22} />
            </span>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-ink">
              Your report will appear here
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
              Submit a URL to see a live report. The first version runs a small
              set of checks it can genuinely verify from the page&apos;s initial
              HTML.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: "Content signals",
                  detail: "Title, meta description, H1, and language.",
                  icon: "layout" as const,
                },
                {
                  title: "Mobile signals",
                  detail: "Responsive viewport and image alt coverage.",
                  icon: "smartphone" as const,
                },
                {
                  title: "Product signals",
                  detail: "Product JSON-LD and add-to-cart markup.",
                  icon: "check" as const,
                },
                {
                  title: "Technical signals",
                  detail: "Indexing directives and page-level metadata.",
                  icon: "code" as const,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-line bg-canvas p-4"
                >
                  <div className="flex items-center gap-2 text-ink">
                    <Icon name={item.icon} size={17} className="text-accent" />
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-xs leading-5 text-muted">
              <Icon name="info" size={16} className="mt-0.5 shrink-0 text-info" />
              <p>
                Anything that needs JavaScript execution, a real device, or
                human judgment will be clearly marked as unverified.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

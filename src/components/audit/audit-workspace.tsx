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
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  failureFromApi,
  failureFromNetwork,
  timeoutFailure,
  unexpectedResponseFailure,
  type AuditFailure,
} from "@/lib/audit/client-errors";
import type { AuditReport } from "@/lib/audit/types";
import { validateAuditUrl } from "@/lib/audit/validation";

type AuditWorkspaceProps = {
  initialUrl?: string;
};

const CLIENT_TIMEOUT_MS = 25_000;

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

export function AuditWorkspace({ initialUrl = "" }: AuditWorkspaceProps) {
  const inputId = useId();
  const helperId = useId();
  const errorId = useId();
  const [url, setUrl] = useState(initialUrl);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [failure, setFailure] = useState<AuditFailure | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoRunRef = useRef(false);
  const resultsRef = useRef<HTMLDivElement>(null);

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
  }, []);

  useEffect(() => {
    if (!initialUrl || autoRunRef.current) return;
    autoRunRef.current = true;
    void runAudit(initialUrl);

    return () => {
      autoRunRef.current = false;
      abortRef.current?.abort();
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
            Use a direct product page for product-specific checks. Only
            server-rendered HTML is inspected.
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
              Only HTML is downloaded. Scripts on the scanned site never run.
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
                  Validating the destination, following safe redirects, and
                  checking the response.
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
            <AuditReportView report={report} />
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

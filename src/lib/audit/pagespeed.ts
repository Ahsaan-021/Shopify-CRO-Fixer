import type {
  SpeedData,
  SpeedOpportunity,
  SpeedResult,
} from "@/lib/audit/types";
import { validateAuditUrl } from "@/lib/audit/validation";

export const PAGESPEED_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export const DEFAULT_PAGESPEED_TIMEOUT_MS = 100_000;
const MAX_OPPORTUNITIES = 4;
const MAX_DIAGNOSTICS = 3;

export type PageSpeedRequest = (
  url: string,
  init: { signal: AbortSignal },
) => Promise<Response>;

type AuditEntry = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  displayValue?: unknown;
  numericValue?: unknown;
  score?: unknown;
  scoreDisplayMode?: unknown;
  details?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function unavailable(
  code: "NO_KEY" | "QUOTA" | "TIMEOUT" | "UPSTREAM" | "MALFORMED",
  message: string,
): SpeedResult {
  return { status: "unavailable", code, message };
}

function numericValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function textValue(value: unknown, max = 240) {
  if (typeof value !== "string") return null;
  const text = cleanText(value);
  return text ? text.slice(0, max) : null;
}

function toListItem(entry: AuditEntry): SpeedOpportunity | null {
  const title = textValue(entry.title, 120);
  if (!title) return null;

  return {
    title,
    displayValue: textValue(entry.displayValue, 80),
    description: textValue(entry.description, 240),
  };
}

/**
 * Reads only fields that Google actually returned. Missing metrics stay null
 * so the UI can say "not returned" instead of inventing a number.
 */
export function parsePageSpeedPayload(
  payload: unknown,
  fetchedAt = new Date().toISOString(),
): SpeedResult {
  if (!isRecord(payload) || !isRecord(payload.lighthouseResult)) {
    return unavailable(
      "MALFORMED",
      "Google PageSpeed returned data this audit could not read.",
    );
  }

  const lighthouse = payload.lighthouseResult;
  const categories = isRecord(lighthouse.categories)
    ? lighthouse.categories
    : null;
  const performance = categories && isRecord(categories.performance)
    ? categories.performance
    : null;
  const audits = isRecord(lighthouse.audits) ? lighthouse.audits : null;

  if (!audits && !performance) {
    return unavailable(
      "MALFORMED",
      "Google PageSpeed returned no performance data for this page.",
    );
  }

  const rawScore = performance?.score;
  const performanceScore =
    typeof rawScore === "number" && Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, Math.round(rawScore * 100)))
      : null;

  const auditEntries: [string, AuditEntry][] = audits
    ? Object.entries(audits)
        .filter((entry): entry is [string, AuditEntry] =>
          isRecord(entry[1]),
        )
        .map(([id, entry]) => [id, entry as AuditEntry])
    : [];

  const auditNumeric = (id: string) => {
    const entry = auditEntries.find(([key]) => key === id)?.[1];
    return numericValue(entry?.numericValue);
  };

  const lcp = auditNumeric("largest-contentful-paint");
  const cls = auditNumeric("cumulative-layout-shift");
  const tbt = auditNumeric("total-blocking-time");
  const inp =
    auditNumeric("experimental-interaction-to-next-paint") ??
    auditNumeric("interaction-to-next-paint");

  const opportunities = auditEntries
    .filter(([, entry]) => {
      const details = isRecord(entry.details) ? entry.details : null;
      return (
        details?.type === "opportunity" &&
        numericValue(entry.numericValue) !== null &&
        (entry.numericValue as number) > 0
      );
    })
    .sort(
      (a, b) =>
        (numericValue(b[1].numericValue) ?? 0) -
        (numericValue(a[1].numericValue) ?? 0),
    )
    .slice(0, MAX_OPPORTUNITIES)
    .map(([, entry]) => toListItem(entry))
    .filter((item): item is SpeedOpportunity => item !== null);

  const diagnostics = auditEntries
    .filter(([, entry]) => {
      const details = isRecord(entry.details) ? entry.details : null;
      if (details?.type === "opportunity") return false;

      const score = entry.score;
      if (typeof score !== "number" || score >= 0.9) return false;

      const mode =
        typeof entry.scoreDisplayMode === "string"
          ? entry.scoreDisplayMode
          : "";
      return (
        mode === "numeric" ||
        mode === "binary" ||
        mode === "informative" ||
        mode === "metricSavings"
      );
    })
    .sort((a, b) => {
      const scoreA = typeof a[1].score === "number" ? a[1].score : 1;
      const scoreB = typeof b[1].score === "number" ? b[1].score : 1;
      return scoreA - scoreB;
    })
    .slice(0, MAX_DIAGNOSTICS)
    .map(([, entry]) => toListItem(entry))
    .filter((item): item is SpeedOpportunity => item !== null);

  const data: SpeedData = {
    source: "Google PageSpeed Insights (lab data)",
    strategy: "mobile",
    fetchedAt,
    performanceScore,
    lcpMs: lcp === null ? null : Math.round(lcp),
    cls: cls === null ? null : Math.round(cls * 1000) / 1000,
    tbtMs: tbt === null ? null : Math.round(tbt),
    inpMs: inp === null ? null : Math.round(inp),
    opportunities,
    diagnostics,
  };

  return { status: "ok", data };
}

function isAbortError(error: unknown) {
  return (
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

/**
 * Calls the fixed Google PageSpeed Insights endpoint. The only scanned-site
 * value sent is the already-validated page URL, properly encoded. The optional
 * API key stays server-side and is never logged or returned.
 */
export async function fetchPageSpeed(
  rawUrl: string,
  options: {
    apiKey?: string;
    timeoutMs?: number;
    request?: PageSpeedRequest;
    now?: () => string;
  } = {},
): Promise<SpeedResult> {
  const validation = validateAuditUrl(rawUrl);
  if (!validation.ok) {
    return unavailable(
      "MALFORMED",
      "The page address was not valid for a speed check.",
    );
  }

  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    return unavailable(
      "NO_KEY",
      "Speed data unavailable: PageSpeed API key not configured.",
    );
  }

  const endpoint = new URL(PAGESPEED_ENDPOINT);
  endpoint.searchParams.set("url", validation.url);
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.append("category", "performance");
  endpoint.searchParams.set("key", apiKey);

  const request =
    options.request ??
    ((url: string, init: { signal: AbortSignal }) => fetch(url, init));
  const timeoutMs = options.timeoutMs ?? DEFAULT_PAGESPEED_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await request(endpoint.toString(), {
      signal: controller.signal,
    });

    if (response.status === 429 || response.status === 403) {
      return unavailable(
        "QUOTA",
        "Google PageSpeed rejected the request because of a quota, rate limit, or key restriction. Try again later.",
      );
    }

    if (!response.ok) {
      if (response.status === 400) {
        return unavailable(
          "UPSTREAM",
          "Google PageSpeed rejected the request. Check that PAGESPEED_API_KEY is a valid key and that the PageSpeed Insights API is enabled for its project.",
        );
      }

      return unavailable(
        "UPSTREAM",
        `Google PageSpeed returned HTTP ${response.status}. Try again later.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return unavailable(
        "MALFORMED",
        "Google PageSpeed returned a response this audit could not read.",
      );
    }

    return parsePageSpeedPayload(
      payload,
      options.now ? options.now() : new Date().toISOString(),
    );
  } catch (error) {
    if (isAbortError(error)) {
      return unavailable(
        "TIMEOUT",
        "Google PageSpeed did not finish this page within 100 seconds. Very heavy or bot-protected pages can exceed Google's audit time, so no speed numbers are shown.",
      );
    }

    return unavailable(
      "UPSTREAM",
      "The speed check could not reach Google PageSpeed. Try again later.",
    );
  } finally {
    clearTimeout(timer);
  }
}

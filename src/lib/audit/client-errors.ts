import type { AuditErrorCode } from "@/lib/audit/types";

export type AuditFailureCode =
  | AuditErrorCode
  | "NETWORK_ERROR"
  | "UNEXPECTED_RESPONSE"
  | "UNKNOWN";

export type AuditFailure = {
  code: AuditFailureCode;
  title: string;
  message: string;
  hint: string;
  retryAfterSeconds?: number;
  upstreamStatus?: number;
  serviceStatus?: number;
};

type FailureMeta = {
  title: string;
  hint: string;
};

const failureMeta: Record<AuditFailureCode, FailureMeta> = {
  INVALID_URL: {
    title: "Check the URL",
    hint: "Enter a public store or product page URL, for example your-store.com/products/item.",
  },
  UNSAFE_TARGET: {
    title: "That address is not public",
    hint: "Local, private, and internal addresses are blocked to protect the scanner and its network.",
  },
  DNS_FAILED: {
    title: "We couldn't find that domain",
    hint: "Check the spelling of the domain and make sure the store is live.",
  },
  DNS_TIMEOUT: {
    title: "The domain lookup timed out",
    hint: "The DNS service did not answer in time. Wait a moment and try again.",
  },
  TIMEOUT: {
    title: "The scan timed out",
    hint: "The page did not finish loading in time. Try again, or scan a lighter product page.",
  },
  TOO_MANY_REDIRECTS: {
    title: "Too many redirects",
    hint: "Use the final public URL from your browser's address bar and try again.",
  },
  RESPONSE_TOO_LARGE: {
    title: "That page is too large",
    hint: "The scanner stops at 2 MB of HTML. Try a single product page instead of a large homepage or collection.",
  },
  UNSUPPORTED_CONTENT: {
    title: "That page isn't HTML",
    hint: "Use a URL that opens a normal web page, not an image, PDF, CSV, or API response.",
  },
  UNSUPPORTED_ENCODING: {
    title: "That page uses an unsupported encoding",
    hint: "The page compresses or encodes its response in a way the scanner cannot safely read.",
  },
  INVALID_RESPONSE: {
    title: "The page couldn't be read",
    hint: "The compressed response was invalid or incomplete. Try the audit again.",
  },
  HTTP_ERROR: {
    title: "The page couldn't be loaded",
    hint: "Open the URL in a browser to confirm it is public and working, then try again.",
  },
  BLOCKED_BY_SITE: {
    title: "The store blocked the scan",
    hint: "Bot protection, a login wall, or a password page stopped the request. Try again later or test from another network.",
  },
  TLS_ERROR: {
    title: "The site's certificate failed",
    hint: "The scanner will not ignore an invalid HTTPS certificate. Check the certificate or use the correct domain.",
  },
  CONNECTION_ERROR: {
    title: "We couldn't connect",
    hint: "The store refused or closed the connection. It may be offline, overloaded, or blocking automated requests.",
  },
  UPSTREAM_ERROR: {
    title: "The page couldn't be reached",
    hint: "Check that the URL is correct and the store is online, then try again.",
  },
  RATE_LIMITED: {
    title: "Too many scans for now",
    hint: "Free scans are limited to five per ten minutes. Wait a few minutes and try again.",
  },
  INVALID_REQUEST: {
    title: "The request was not valid",
    hint: "Reload the audit page and submit a public store or product page URL.",
  },
  INTERNAL_ERROR: {
    title: "The audit service had a problem",
    hint: "This is a hosting or audit-service problem, not your store. If you just deployed, wait for the deployment to finish, then try again.",
  },
  NETWORK_ERROR: {
    title: "The audit service couldn't be reached",
    hint: "Check your internet connection. The scan request never reached the server.",
  },
  UNEXPECTED_RESPONSE: {
    title: "Unexpected audit response",
    hint: "The audit service returned a response this page did not understand. Reload the page and try again.",
  },
  UNKNOWN: {
    title: "The audit could not finish",
    hint: "Try the audit again. If it keeps failing, open the page in a browser to confirm it is public.",
  },
};

function isAuditErrorCode(value: string): value is AuditErrorCode {
  return value in failureMeta;
}

function cleanMessage(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 400);
}

function parseErrorPayload(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return null;
  const error = (payload as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return null;

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    retryAfterSeconds?: unknown;
    upstreamStatus?: unknown;
  };

  return {
    code: typeof candidate.code === "string" ? candidate.code : null,
    message: cleanMessage(candidate.message),
    retryAfterSeconds:
      typeof candidate.retryAfterSeconds === "number" &&
      Number.isFinite(candidate.retryAfterSeconds) &&
      candidate.retryAfterSeconds > 0
        ? Math.ceil(candidate.retryAfterSeconds)
        : undefined,
    upstreamStatus:
      typeof candidate.upstreamStatus === "number" &&
      Number.isInteger(candidate.upstreamStatus)
        ? candidate.upstreamStatus
        : undefined,
  };
}

function inferCodeFromStatus(httpStatus: number): AuditFailureCode {
  if (httpStatus === 408 || httpStatus === 504) return "TIMEOUT";
  if (httpStatus === 429) return "RATE_LIMITED";
  if (httpStatus === 413) return "INVALID_REQUEST";
  if (httpStatus >= 500) return "INTERNAL_ERROR";
  return "UNKNOWN";
}

function fallbackMessage(httpStatus: number) {
  if (httpStatus === 408 || httpStatus === 504) {
    return "The scan took too long to complete. Try again or audit a lighter page.";
  }
  if (httpStatus === 429) {
    return "You have reached the free scan limit for now. Please wait and try again.";
  }
  if (httpStatus === 502 || httpStatus === 503) {
    return "The audit service is temporarily unavailable. This can happen during a deployment or when the hosting function fails. Try again in a moment.";
  }
  if (httpStatus >= 500) {
    return "The audit service could not complete this scan because the hosting function returned an error. Try again in a moment.";
  }
  return "The audit could not be completed. Please try again.";
}

function retryHint(
  code: AuditFailureCode,
  retryAfterSeconds: number | undefined,
  fallback: string,
) {
  if (code !== "RATE_LIMITED" || !retryAfterSeconds) return fallback;

  const minutes = Math.ceil(retryAfterSeconds / 60);
  const wait =
    retryAfterSeconds >= 60
      ? `${minutes} minute${minutes === 1 ? "" : "s"}`
      : `${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}`;

  return `Free scans are limited to five per ten minutes. Try again in about ${wait}.`;
}

function httpErrorTitle(upstreamStatus: number | undefined) {
  if (upstreamStatus === 404 || upstreamStatus === 410) {
    return "That page was not found";
  }
  if (upstreamStatus === 429) return "The store is busy";
  if (upstreamStatus === 401 || upstreamStatus === 403) {
    return "The store blocked the scan";
  }
  if (upstreamStatus && upstreamStatus >= 500) {
    return "The store returned an error";
  }
  return failureMeta.HTTP_ERROR.title;
}

/**
 * Maps an API response to a specific, user-safe failure. This also handles
 * hosting/proxy responses that are not JSON (for example a platform 504 page),
 * which previously fell through to one generic message.
 */
export function failureFromApi(
  httpStatus: number,
  payload: unknown,
): AuditFailure {
  const parsed = parseErrorPayload(payload);
  const rawCode = parsed?.code;
  const code: AuditFailureCode =
    rawCode && isAuditErrorCode(rawCode)
      ? rawCode
      : inferCodeFromStatus(httpStatus);
  const meta = failureMeta[code];

  return {
    code,
    title:
      code === "HTTP_ERROR"
        ? httpErrorTitle(parsed?.upstreamStatus)
        : meta.title,
    message: parsed?.message ?? fallbackMessage(httpStatus),
    hint: retryHint(code, parsed?.retryAfterSeconds, meta.hint),
    retryAfterSeconds: parsed?.retryAfterSeconds,
    upstreamStatus: parsed?.upstreamStatus,
    serviceStatus: parsed?.code ? undefined : httpStatus,
  };
}

export function unexpectedResponseFailure(): AuditFailure {
  return {
    code: "UNEXPECTED_RESPONSE",
    ...failureMeta.UNEXPECTED_RESPONSE,
    message:
      "The audit returned an unexpected response. Reload the page and try again.",
  };
}

export function timeoutFailure(): AuditFailure {
  return {
    code: "TIMEOUT",
    ...failureMeta.TIMEOUT,
    message: "The audit took too long to respond. Please try again.",
  };
}

export function failureFromNetwork(error: unknown): AuditFailure {
  if (
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "TimeoutError") ||
    (error instanceof Error && error.name === "TimeoutError")
  ) {
    return timeoutFailure();
  }

  if (error instanceof TypeError) {
    return {
      code: "NETWORK_ERROR",
      ...failureMeta.NETWORK_ERROR,
      message:
        "We couldn't reach the audit service. Check your internet connection and try again.",
    };
  }

  return {
    code: "UNKNOWN",
    ...failureMeta.UNKNOWN,
    message: "The audit could not be completed. Please try again.",
  };
}

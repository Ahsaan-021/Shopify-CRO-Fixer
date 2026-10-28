import { AuditScanError } from "@/lib/audit/errors";

/**
 * Turns a non-success HTTP response from the scanned site into a safe,
 * actionable audit error. The scanned site's status is kept as
 * `upstreamStatus` so the UI can distinguish a missing page from bot
 * protection without exposing response headers or internals.
 */
export function auditErrorForHttpStatus(status: number) {
  if (status >= 300 && status < 400) {
    return new AuditScanError(
      "HTTP_ERROR",
      `The store returned an incomplete redirect (HTTP ${status}). Open the final URL and try again.`,
      422,
      status,
    );
  }

  if (status === 401) {
    return new AuditScanError(
      "BLOCKED_BY_SITE",
      "The store returned HTTP 401 and requires a login. The scanner only audits public pages.",
      422,
      status,
    );
  }

  if (status === 403) {
    return new AuditScanError(
      "BLOCKED_BY_SITE",
      "The store returned HTTP 403. It may use bot protection, require a login, or restrict automated requests.",
      422,
      status,
    );
  }

  if (status === 404 || status === 410) {
    return new AuditScanError(
      "HTTP_ERROR",
      `The store returned HTTP ${status} for this address. Check the URL and try again.`,
      422,
      status,
    );
  }

  if (status === 429) {
    return new AuditScanError(
      "HTTP_ERROR",
      "The store returned HTTP 429 because it is rate-limiting requests. Wait a few minutes, then try again.",
      422,
      status,
    );
  }

  if (status >= 500) {
    return new AuditScanError(
      "HTTP_ERROR",
      `The store returned a server error (HTTP ${status}). Check that the page is publicly available, then try again later.`,
      422,
      status,
    );
  }

  return new AuditScanError(
    "HTTP_ERROR",
    `The page returned HTTP ${status}. Check that the URL is public and correct.`,
    422,
    status,
  );
}

/**
 * Keeps an untrusted Content-Type short and presentable while preserving
 * enough information to explain why the scanner stopped.
 */
export function unsupportedContentError(contentType: string) {
  const mediaType = /^[a-z0-9.+-]+\/[a-z0-9.+-]+/i.exec(
    contentType.trim().toLowerCase(),
  )?.[0];

  return new AuditScanError(
    "UNSUPPORTED_CONTENT",
    mediaType
      ? `That address returned ${mediaType}, not an HTML page, so there is nothing safe to audit.`
      : "That address did not return an HTML page, so there is nothing safe to audit.",
  );
}

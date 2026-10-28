import { AuditScanError } from "@/lib/audit/errors";

const DNS_CODES = new Set(["ENOTFOUND", "EAI_AGAIN", "EAI_FAIL", "EAI_NODATA"]);

const TIMEOUT_CODES = new Set(["ETIMEDOUT", "ESOCKETTIMEDOUT"]);

const CONNECTION_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EADDRNOTAVAIL",
]);

const TLS_CODES = new Set([
  "CERT_HAS_EXPIRED",
  "CERT_NOT_YET_VALID",
  "CERT_REJECTED",
  "CERT_UNTRUSTED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "ERR_SSL_WRONG_VERSION_NUMBER",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "EPROTO",
]);

function errorCode(error: unknown) {
  if (typeof error !== "object" || error === null) return "";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code.toUpperCase() : "";
}

/**
 * Classifies a raw socket/TLS/DNS failure into a safe audit error.
 *
 * Raw Node error text can contain hostnames, IP addresses, or certificate
 * details. Only the fixed messages below are returned to the client.
 */
export function auditErrorForRequestFailure(error: unknown): AuditScanError {
  if (error instanceof AuditScanError) return error;

  const code = errorCode(error);

  if (DNS_CODES.has(code)) {
    return new AuditScanError(
      "DNS_FAILED",
      "We could not resolve that domain. Check the store URL and try again.",
    );
  }

  if (TIMEOUT_CODES.has(code)) {
    return new AuditScanError(
      "TIMEOUT",
      "The page took too long to respond. Try again or audit a lighter page.",
      504,
    );
  }

  if (CONNECTION_CODES.has(code)) {
    return new AuditScanError(
      "CONNECTION_ERROR",
      code === "ECONNREFUSED"
        ? "The store refused the connection. It may be offline or blocking automated requests."
        : "The connection closed before the page finished loading. Try again.",
      502,
    );
  }

  if (
    TLS_CODES.has(code) ||
    code.startsWith("ERR_TLS_") ||
    code.startsWith("ERR_SSL_")
  ) {
    return new AuditScanError(
      "TLS_ERROR",
      "The page's HTTPS certificate could not be verified, so the scan stopped.",
      502,
    );
  }

  const rawMessage = error instanceof Error ? error.message.toLowerCase() : "";
  if (
    rawMessage.includes("certificate") ||
    rawMessage.includes("self signed") ||
    rawMessage.includes("ssl routines")
  ) {
    return new AuditScanError(
      "TLS_ERROR",
      "The page's HTTPS certificate could not be verified, so the scan stopped.",
      502,
    );
  }

  return new AuditScanError(
    "UPSTREAM_ERROR",
    "We could not connect to that page. Check the URL and try again.",
    502,
  );
}

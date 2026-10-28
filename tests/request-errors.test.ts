import { describe, expect, it } from "vitest";
import {
  auditErrorForHttpStatus,
  unsupportedContentError,
} from "@/lib/audit/http-status-error";
import { AuditScanError } from "@/lib/audit/errors";
import { auditErrorForRequestFailure } from "@/lib/audit/request-errors";

function nodeError(code: string) {
  return Object.assign(new Error(`raw ${code} details`), { code });
}

describe("auditErrorForHttpStatus", () => {
  const cases: Array<[number, string, number]> = [
    [301, "HTTP_ERROR", 301],
    [401, "BLOCKED_BY_SITE", 401],
    [403, "BLOCKED_BY_SITE", 403],
    [404, "HTTP_ERROR", 404],
    [410, "HTTP_ERROR", 410],
    [429, "HTTP_ERROR", 429],
    [500, "HTTP_ERROR", 500],
    [503, "HTTP_ERROR", 503],
    [418, "HTTP_ERROR", 418],
  ];

  it.each(cases)(
    "maps HTTP %i to %s without exposing a stack trace",
    (status, code, upstreamStatus) => {
      const error = auditErrorForHttpStatus(status);

      expect(error).toBeInstanceOf(AuditScanError);
      expect(error.code).toBe(code);
      expect(error.upstreamStatus).toBe(upstreamStatus);
      expect(error.httpStatus).toBe(422);
      expect(error.message).toContain(`HTTP ${status}`);
      expect(error.message).not.toContain("raw");
    },
  );

  it("explains bot protection for 403 responses", () => {
    expect(auditErrorForHttpStatus(403).message).toContain("bot protection");
  });

  it("explains rate limiting for 429 responses", () => {
    expect(auditErrorForHttpStatus(429).message).toContain("rate-limiting");
  });

  it("explains incomplete redirects", () => {
    expect(auditErrorForHttpStatus(302).message).toContain(
      "incomplete redirect",
    );
  });
});

describe("unsupportedContentError", () => {
  it("names a safe media type", () => {
    expect(unsupportedContentError("application/json; charset=utf-8")).toMatchObject({
      code: "UNSUPPORTED_CONTENT",
    });
    expect(
      unsupportedContentError("application/json; charset=utf-8").message,
    ).toContain("application/json");
  });

  it("does not echo unsafe header content", () => {
    const error = unsupportedContentError(
      "text/html<script>alert(1)</script>",
    );
    expect(error.message).not.toContain("<script>");
    expect(error.message).toContain("text/html");
  });

  it("uses a generic message when no usable type is present", () => {
    const error = unsupportedContentError("");
    expect(error.message).toContain("did not return an HTML page");
  });
});

describe("auditErrorForRequestFailure", () => {
  const cases: Array<[string, string]> = [
    ["ENOTFOUND", "DNS_FAILED"],
    ["EAI_AGAIN", "DNS_FAILED"],
    ["ETIMEDOUT", "TIMEOUT"],
    ["ECONNREFUSED", "CONNECTION_ERROR"],
    ["ECONNRESET", "CONNECTION_ERROR"],
    ["EHOSTUNREACH", "CONNECTION_ERROR"],
    ["EPROTO", "TLS_ERROR"],
    ["DEPTH_ZERO_SELF_SIGNED_CERT", "TLS_ERROR"],
    ["ERR_TLS_CERT_ALTNAME_INVALID", "TLS_ERROR"],
    ["ERR_SSL_WRONG_VERSION_NUMBER", "TLS_ERROR"],
    ["SOMETHING_ELSE", "UPSTREAM_ERROR"],
  ];

  it.each(cases)("maps %s to %s", (nodeCode, auditCode) => {
    const error = auditErrorForRequestFailure(nodeError(nodeCode));

    expect(error).toBeInstanceOf(AuditScanError);
    expect(error.code).toBe(auditCode);
    expect(error.message).not.toContain(nodeCode);
    expect(error.message).not.toContain("raw");
    expect(error.message.length).toBeGreaterThan(20);
  });

  it("passes an existing audit error through unchanged", () => {
    const original = new AuditScanError("BLOCKED_BY_SITE", "Blocked", 422, 403);
    expect(auditErrorForRequestFailure(original)).toBe(original);
  });

  it("does not expose a raw TLS message", () => {
    const raw = new Error(
      "unable to verify the first certificate for internal.example:443",
    );
    const error = auditErrorForRequestFailure(raw);
    expect(error.message).not.toContain("internal.example");
    expect(error.code).toBe("TLS_ERROR");
  });
});

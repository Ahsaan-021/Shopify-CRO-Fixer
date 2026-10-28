import { describe, expect, it } from "vitest";
import {
  failureFromApi,
  failureFromNetwork,
  timeoutFailure,
  unexpectedResponseFailure,
} from "@/lib/audit/client-errors";

describe("failureFromApi", () => {
  it("keeps the specific API message and code", () => {
    const failure = failureFromApi(422, {
      error: {
        code: "DNS_FAILED",
        message: "We could not find that domain. Check the store URL and try again.",
      },
    });

    expect(failure).toMatchObject({
      code: "DNS_FAILED",
      title: "We couldn't find that domain",
      message:
        "We could not find that domain. Check the store URL and try again.",
    });
    expect(failure.hint.length).toBeGreaterThan(20);
  });

  it("shows a blocked-site title for a 403 challenge", () => {
    const failure = failureFromApi(422, {
      error: {
        code: "BLOCKED_BY_SITE",
        message: "The store blocked the scan (HTTP 403).",
        upstreamStatus: 403,
      },
    });

    expect(failure.code).toBe("BLOCKED_BY_SITE");
    expect(failure.title).toBe("The store blocked the scan");
    expect(failure.upstreamStatus).toBe(403);
  });

  it("distinguishes a missing page from a server error", () => {
    const missing = failureFromApi(422, {
      error: {
        code: "HTTP_ERROR",
        message: "That page was not found (HTTP 404).",
        upstreamStatus: 404,
      },
    });
    const serverError = failureFromApi(422, {
      error: {
        code: "HTTP_ERROR",
        message: "The store returned a server error (HTTP 503).",
        upstreamStatus: 503,
      },
    });

    expect(missing.title).toBe("That page was not found");
    expect(serverError.title).toBe("The store returned an error");
  });

  it("turns a non-JSON platform 504 into a specific timeout message", () => {
    const failure = failureFromApi(504, null);

    expect(failure.code).toBe("TIMEOUT");
    expect(failure.title).toBe("The scan timed out");
    expect(failure.message).toContain("took too long");
    expect(failure.serviceStatus).toBe(504);
    expect(failure.message).not.toContain("Something went wrong");
  });

  it("turns a non-JSON 502 into a hosting-layer message and keeps the status", () => {
    const failure = failureFromApi(502, null);

    expect(failure.code).toBe("INTERNAL_ERROR");
    expect(failure.title).toBe("The audit service had a problem");
    expect(failure.message).toContain("hosting function");
    expect(failure.serviceStatus).toBe(502);
  });

  it("turns a non-JSON 429 into a rate-limit message", () => {
    const failure = failureFromApi(429, null);

    expect(failure.code).toBe("RATE_LIMITED");
    expect(failure.title).toBe("Too many scans for now");
    expect(failure.message).toContain("limit");
    expect(failure.serviceStatus).toBe(429);
  });

  it("includes the retry delay from the API", () => {
    const failure = failureFromApi(429, {
      error: {
        code: "RATE_LIMITED",
        message: "You have reached the free scan limit for now.",
        retryAfterSeconds: 90,
      },
    });

    expect(failure.retryAfterSeconds).toBe(90);
    expect(failure.hint).toContain("2 minutes");
  });

  it("falls back safely when the API payload is malformed", () => {
    const failure = failureFromApi(400, {
      error: { code: "SOMETHING_NEW", message: 42 },
    });

    expect(failure.code).toBe("UNKNOWN");
    expect(failure.title).toBe("The audit could not finish");
    expect(failure.message).toBe(
      "The audit could not be completed. Please try again.",
    );
  });

  it("does not expose a long or multi-line API message verbatim", () => {
    const message = `  first line\n\nsecond line   ${"x".repeat(500)}  `;
    const failure = failureFromApi(422, {
      error: { code: "DNS_FAILED", message },
    });

    expect(failure.message).toHaveLength(400);
    expect(failure.message).not.toContain("\n");
  });
});

describe("client-side failures", () => {
  it("maps a failed fetch to a network message, not an upstream claim", () => {
    const failure = failureFromNetwork(new TypeError("fetch failed"));

    expect(failure.code).toBe("NETWORK_ERROR");
    expect(failure.title).toBe("The audit service couldn't be reached");
    expect(failure.message).not.toContain("fetch failed");
  });

  it("does not show an unknown exception's raw text", () => {
    const failure = failureFromNetwork(
      new Error("ECONNREFUSED 127.0.0.1:3000"),
    );

    expect(failure.code).toBe("UNKNOWN");
    expect(failure.message).not.toContain("ECONNREFUSED");
    expect(failure.message).not.toContain("127.0.0.1");
  });

  it("provides a timeout failure for the client-side deadline", () => {
    expect(timeoutFailure()).toMatchObject({
      code: "TIMEOUT",
      title: "The scan timed out",
    });
  });

  it("provides an unexpected-response failure", () => {
    expect(unexpectedResponseFailure()).toMatchObject({
      code: "UNEXPECTED_RESPONSE",
      title: "Unexpected audit response",
    });
  });
});

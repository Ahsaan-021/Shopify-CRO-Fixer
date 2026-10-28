import { describe, expect, it } from "vitest";
import {
  fetchPageSpeed,
  parsePageSpeedPayload,
  PAGESPEED_ENDPOINT,
  type PageSpeedRequest,
} from "@/lib/audit/pagespeed";

function payload() {
  return {
    lighthouseResult: {
      categories: {
        performance: { score: 0.87 },
      },
      audits: {
        "largest-contentful-paint": {
          title: "Largest Contentful Paint",
          numericValue: 2500,
          score: 0.5,
          scoreDisplayMode: "numeric",
          details: { type: "numeric" },
        },
        "cumulative-layout-shift": {
          title: "Cumulative Layout Shift",
          numericValue: 0.1234,
          score: 0.8,
          scoreDisplayMode: "numeric",
          details: { type: "numeric" },
        },
        "total-blocking-time": {
          title: "Total Blocking Time",
          numericValue: 300,
          score: 0.7,
          scoreDisplayMode: "numeric",
          details: { type: "numeric" },
        },
        "interaction-to-next-paint": {
          title: "Interaction to Next Paint",
          numericValue: 210,
          score: 0.6,
          scoreDisplayMode: "numeric",
          details: { type: "numeric" },
        },
        "render-blocking-resources": {
          title: "Eliminate render-blocking resources",
          description: "Remove or defer resources that block the first paint.",
          displayValue: "1.2 s",
          numericValue: 1200,
          score: 0.3,
          scoreDisplayMode: "numeric",
          details: { type: "opportunity" },
        },
        "unused-javascript": {
          title: "Reduce unused JavaScript",
          description: "Remove code that is not needed by this page.",
          displayValue: "300 ms",
          numericValue: 300,
          score: 0.4,
          scoreDisplayMode: "numeric",
          details: { type: "opportunity" },
        },
        "dom-size": {
          title: "Avoid an excessive DOM size",
          description: "A large DOM can slow down rendering.",
          numericValue: 1500,
          score: 0.2,
          scoreDisplayMode: "numeric",
          details: { type: "table" },
        },
      },
    },
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("parsePageSpeedPayload", () => {
  it("reads Google's score, metrics, opportunities, and diagnostics", () => {
    const result = parsePageSpeedPayload(
      payload(),
      "2026-01-01T00:00:00.000Z",
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.data).toMatchObject({
      source: "Google PageSpeed Insights (lab data)",
      strategy: "mobile",
      fetchedAt: "2026-01-01T00:00:00.000Z",
      performanceScore: 87,
      lcpMs: 2500,
      cls: 0.123,
      tbtMs: 300,
      inpMs: 210,
    });
    expect(result.data.opportunities.map((item) => item.title)).toEqual([
      "Eliminate render-blocking resources",
      "Reduce unused JavaScript",
    ]);
    expect(result.data.diagnostics.length).toBeGreaterThan(0);
    expect(result.data.diagnostics.length).toBeLessThanOrEqual(3);
  });

  it("keeps missing metrics null instead of inventing numbers", () => {
    const result = parsePageSpeedPayload({
      lighthouseResult: { categories: {}, audits: {} },
    });

    expect(result).toMatchObject({
      status: "ok",
      data: {
        performanceScore: null,
        lcpMs: null,
        cls: null,
        tbtMs: null,
        inpMs: null,
      },
    });
  });

  it("rejects a malformed PSI response", () => {
    expect(parsePageSpeedPayload({})).toMatchObject({
      status: "unavailable",
      code: "MALFORMED",
    });
    expect(parsePageSpeedPayload(null)).toMatchObject({
      status: "unavailable",
      code: "MALFORMED",
    });
  });
});

describe("fetchPageSpeed", () => {
  it("calls the fixed Google endpoint with encoded mobile parameters", async () => {
    let requested = "";
    const request: PageSpeedRequest = async (url) => {
      requested = url;
      return jsonResponse(payload());
    };

    const result = await fetchPageSpeed(
      "https://store.com/products/trail-runner-2?utm_source=test",
      {
        request,
        apiKey: "test-key",
        now: () => "2026-01-01T00:00:00.000Z",
      },
    );

    const endpoint = new URL(requested);
    expect(`${endpoint.origin}${endpoint.pathname}`).toBe(PAGESPEED_ENDPOINT);
    expect(endpoint.searchParams.get("strategy")).toBe("mobile");
    expect(endpoint.searchParams.get("category")).toBe("performance");
    expect(endpoint.searchParams.get("url")).toBe(
      "https://store.com/products/trail-runner-2?utm_source=test",
    );
    expect(endpoint.searchParams.get("key")).toBe("test-key");
    expect(result.status).toBe("ok");
    expect(JSON.stringify(result)).not.toContain("test-key");
  });

  it("returns the exact missing-key message without calling Google", async () => {
    let calls = 0;
    const request: PageSpeedRequest = async () => {
      calls += 1;
      return jsonResponse(payload());
    };

    const result = await fetchPageSpeed("https://store.com/", { request });

    expect(calls).toBe(0);
    expect(result).toMatchObject({
      status: "unavailable",
      code: "NO_KEY",
      message: "Speed data unavailable: PageSpeed API key not configured.",
    });
  });

  it("maps quota errors to an honest unavailable result", async () => {
    const request: PageSpeedRequest = async () =>
      jsonResponse({ error: { message: "quota" } }, 429);

    const result = await fetchPageSpeed("https://store.com/", {
      request,
      apiKey: "test-key",
    });

    expect(result).toMatchObject({
      status: "unavailable",
      code: "QUOTA",
    });
  });

  it("times out without hanging the caller", async () => {
    const request: PageSpeedRequest = (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });

    const result = await fetchPageSpeed("https://store.com/", {
      request,
      apiKey: "test-key",
      timeoutMs: 10,
    });

    expect(result).toMatchObject({
      status: "unavailable",
      code: "TIMEOUT",
    });
  });

  it("maps malformed and upstream responses safely", async () => {
    const malformed: PageSpeedRequest = async () =>
      new Response("not json", { status: 200 });
    const upstream: PageSpeedRequest = async () =>
      new Response("unavailable", { status: 503 });

    expect(
      await fetchPageSpeed("https://store.com/", {
        request: malformed,
        apiKey: "test-key",
      }),
    ).toMatchObject({ status: "unavailable", code: "MALFORMED" });
    expect(
      await fetchPageSpeed("https://store.com/", {
        request: upstream,
        apiKey: "test-key",
      }),
    ).toMatchObject({ status: "unavailable", code: "UPSTREAM" });
  });

  it("never includes the API key in a failure result", async () => {
    const key = "very-secret-key-value";
    const request: PageSpeedRequest = async () =>
      jsonResponse({ error: { message: `bad key ${key}` } }, 429);

    const result = await fetchPageSpeed("https://store.com/", {
      request,
      apiKey: key,
    });

    expect(JSON.stringify(result)).not.toContain(key);
  });

  it("rejects an invalid target before calling Google", async () => {
    let calls = 0;
    const request: PageSpeedRequest = async () => {
      calls += 1;
      return jsonResponse(payload());
    };

    const result = await fetchPageSpeed("http://127.0.0.1/", { request });

    expect(result).toMatchObject({
      status: "unavailable",
      code: "MALFORMED",
    });
    expect(calls).toBe(0);
  });
});

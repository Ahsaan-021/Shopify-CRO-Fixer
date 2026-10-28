import {
  brotliCompressSync,
  deflateSync,
  gzipSync,
} from "node:zlib";
import { describe, expect, it } from "vitest";
import { AuditScanError } from "@/lib/audit/errors";
import {
  decodeHtml,
  fetchPublicHtml,
  type PageRequest,
  type PageResponse,
} from "@/lib/audit/fetch-page";

function page(overrides: Partial<PageResponse> = {}): PageResponse {
  return {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    html: "<!doctype html><html><head><title>Final</title></head></html>",
    bytes: 60,
    redirectTo: null,
    ...overrides,
  };
}

function redirect(location: string, status = 302): PageResponse {
  return page({
    status,
    headers: { location },
    html: "",
    bytes: 0,
    redirectTo: location,
  });
}

async function expectAuditError(
  promise: Promise<unknown>,
  code: string,
) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("fetchPublicHtml redirects", () => {
  it("follows a relative redirect and records it", async () => {
    const seen: string[] = [];
    const request: PageRequest = async (url) => {
      seen.push(url.toString());
      if (url.pathname === "/start") return redirect("/final");
      return page();
    };

    const result = await fetchPublicHtml(
      "https://example.com/start",
      Date.now() + 10_000,
      request,
    );

    expect(seen).toEqual([
      "https://example.com/start",
      "https://example.com/final",
    ]);
    expect(result.finalUrl).toBe("https://example.com/final");
    expect(result.status).toBe(200);
    expect(result.redirects).toEqual([
      {
        from: "https://example.com/start",
        to: "https://example.com/final",
        status: 302,
      },
    ]);
  });

  it("stops after four redirects", async () => {
    let calls = 0;
    const request: PageRequest = async () => {
      calls += 1;
      return redirect(`/hop-${calls}`);
    };

    await expectAuditError(
      fetchPublicHtml("https://example.com/start", Date.now() + 10_000, request),
      "TOO_MANY_REDIRECTS",
    );
    expect(calls).toBe(5);
  });

  it("rejects a redirect to a loopback address before requesting it", async () => {
    const seen: string[] = [];
    const request: PageRequest = async (url) => {
      seen.push(url.toString());
      return redirect("http://127.0.0.1/admin");
    };

    await expectAuditError(
      fetchPublicHtml("https://example.com/start", Date.now() + 10_000, request),
      "UNSAFE_TARGET",
    );
    expect(seen).toHaveLength(1);
  });

  it("rejects a redirect to an internal hostname", async () => {
    const request: PageRequest = async () => redirect("http://localhost/");

    await expectAuditError(
      fetchPublicHtml("https://example.com/start", Date.now() + 10_000, request),
      "UNSAFE_TARGET",
    );
  });

  it("stops when the overall deadline has passed", async () => {
    let calls = 0;
    const request: PageRequest = async () => {
      calls += 1;
      return page();
    };

    await expectAuditError(
      fetchPublicHtml("https://example.com/start", Date.now() - 1, request),
      "TIMEOUT",
    );
    expect(calls).toBe(0);
  });

  it("rejects an invalid initial URL before requesting anything", async () => {
    let calls = 0;
    const request: PageRequest = async () => {
      calls += 1;
      return page();
    };

    await expectAuditError(
      fetchPublicHtml("http://127.0.0.1/", Date.now() + 10_000, request),
      "INVALID_URL",
    );
    expect(calls).toBe(0);
  });

  it("passes through a scan failure from the request layer", async () => {
    const original = new AuditScanError(
      "BLOCKED_BY_SITE",
      "The store blocked the scan.",
    );
    const request: PageRequest = async () => {
      throw original;
    };

    await expect(
      fetchPublicHtml("https://example.com/start", Date.now() + 10_000, request),
    ).rejects.toBe(original);
  });

  it("reads and joins X-Robots-Tag headers", async () => {
    const request: PageRequest = async () =>
      page({
        headers: {
          "content-type": "text/html",
          "x-robots-tag": ["noindex", "nofollow"],
        },
      });

    const result = await fetchPublicHtml(
      "https://example.com/",
      Date.now() + 10_000,
      request,
    );

    expect(result.xRobotsTag).toBe("noindex, nofollow");
  });
});

describe("decodeHtml", () => {
  const html = "<!doctype html><html><body>ok</body></html>";

  it("decodes gzip, deflate, and Brotli responses", () => {
    expect(decodeHtml(gzipSync(html), "gzip", "text/html")).toBe(html);
    expect(decodeHtml(deflateSync(html), "deflate", "text/html")).toBe(html);
    expect(decodeHtml(brotliCompressSync(html), "br", "text/html")).toBe(html);
  });

  it("decodes an identity response", () => {
    expect(decodeHtml(Buffer.from(html), "", "text/html")).toBe(html);
  });

  it("rejects an unsupported content encoding", () => {
    expect(() => decodeHtml(Buffer.from(html), "zstd", "text/html")).toThrowError(
      expect.objectContaining({ code: "UNSUPPORTED_ENCODING" }),
    );
  });

  it("rejects a malformed compressed response", () => {
    expect(() =>
      decodeHtml(Buffer.from("not valid gzip"), "gzip", "text/html"),
    ).toThrowError(expect.objectContaining({ code: "INVALID_RESPONSE" }));
  });

  it("rejects HTML that expands beyond 2 MB", () => {
    const tooLarge = gzipSync(Buffer.alloc(2 * 1024 * 1024 + 1, "a"));

    expect(() => decodeHtml(tooLarge, "gzip", "text/html")).toThrowError(
      expect.objectContaining({ code: "RESPONSE_TOO_LARGE" }),
    );
  });
});

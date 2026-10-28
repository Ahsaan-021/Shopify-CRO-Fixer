import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as speedPost } from "@/app/api/speed/route";
import { POST as renderPost } from "@/app/api/render/route";

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PageSpeed route", () => {
  it("returns the exact missing-key message and never echoes a key", async () => {
    vi.stubEnv("PAGESPEED_API_KEY", "");

    const response = await speedPost(
      jsonRequest("/api/speed", {
        url: "https://store.com/products/item",
      }),
    );
    const text = await response.text();
    const payload = JSON.parse(text) as {
      status: string;
      code: string;
      message: string;
    };

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "unavailable",
      code: "NO_KEY",
      message: "Speed data unavailable: PageSpeed API key not configured.",
    });
    expect(text).not.toContain("AIza");
    expect(text).not.toContain("key=");
    expect(text).not.toContain("stack");
  });
});

describe("rendered route", () => {
  it("returns DISABLED without a browser when rendering is switched off", async () => {
    vi.stubEnv("RENDERED_AUDIT_ENABLED", "false");

    const response = await renderPost(
      jsonRequest("/api/render", {
        url: "https://store.com/products/item",
      }),
    );
    const payload = (await response.json()) as {
      status: string;
      code: string;
      message: string;
    };

    expect(payload).toMatchObject({ status: "unavailable", code: "DISABLED" });
    expect(payload.message).toContain("Static HTML and product JSON");
  });

  it("rejects private targets before any render work", async () => {
    vi.stubEnv("RENDERED_AUDIT_ENABLED", "true");

    const response = await renderPost(
      jsonRequest("/api/render", { url: "http://127.0.0.1/" }),
    );
    const payload = (await response.json()) as {
      error: { code: string; message: string };
    };

    expect(payload.error.code).toBe("INVALID_URL");
    expect(JSON.stringify(payload)).not.toContain("127.0.0.1");
  });

  it("rejects an oversized body with a safe code", async () => {
    const response = await renderPost(
      new Request("http://localhost/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "x".repeat(5_000) }),
      }),
    );
    const payload = (await response.json()) as {
      error: { code: string; message: string };
    };

    expect(payload.error.code).toBe("INVALID_REQUEST");
    expect(payload.error.message).toBe("The request was too large.");
  });
});

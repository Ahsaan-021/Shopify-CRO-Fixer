import { describe, expect, it } from "vitest";
import { runRenderedAudit } from "@/lib/audit/render/run";
import { RenderFailure } from "@/lib/audit/render/errors";
import type { BrowserSnapshot } from "@/lib/audit/render/browser";
import { snapshot } from "./fixtures/rendered-snapshot";

describe("rendered audit fallback", () => {
  it("returns DISABLED without launching a browser when rendering is off", async () => {
    let called = false;

    const result = await runRenderedAudit("https://store.com/products/item", {
      enabled: false,
      render: async () => {
        called = true;
        throw new Error("should not run");
      },
    });

    expect(called).toBe(false);
    expect(result).toMatchObject({
      status: "unavailable",
      code: "DISABLED",
    });
    if (result.status === "unavailable") {
      expect(result.message).toContain("Static HTML and product JSON");
    }
  });

  it("returns a structured error instead of throwing when rendering fails", async () => {
    const result = await runRenderedAudit("https://store.com/products/item", {
      enabled: true,
      render: async () => {
        throw new RenderFailure(
          "NO_BROWSER",
          "Rendered scanning is unavailable because no browser could be started on the server.",
        );
      },
    });

    expect(result).toMatchObject({
      status: "unavailable",
      code: "NO_BROWSER",
    });
    expect(JSON.stringify(result)).not.toContain("stack");
    expect(JSON.stringify(result)).not.toContain("C:\\");
  });

  it("never exposes a raw browser error message to the client", async () => {
    const result = await runRenderedAudit("https://store.com/products/item", {
      enabled: true,
      render: async () => {
        throw new Error(
          "net::ERR_TUNNEL_CONNECTION_FAILED at 10.0.0.5 while using secret-token",
        );
      },
    });

    expect(result).toMatchObject({ status: "unavailable", code: "ERROR" });
    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain("10.0.0.5");
    expect(serialised).not.toContain("secret-token");
    expect(serialised).not.toContain("ERR_TUNNEL");
  });

  it("builds checks and a screenshot payload from a successful render", async () => {
    const browserSnapshot: BrowserSnapshot = {
      snapshot: snapshot({
        texts: {
          aboveFold: "",
          nearBuyBox: "Free shipping. 30-day money-back guarantee.",
          belowFold: "",
          footer: "",
          pageWide: "",
        },
      }),
      screenshot: {
        mime: "image/jpeg",
        base64: "ZmFrZQ==",
        width: 390,
        height: 844,
        bytes: 4,
      },
      finalUrl: "https://store.com/products/item",
      proxyStats: { connections: 3, bytes: 1000, blocked: 0 },
    };

    const result = await runRenderedAudit("https://store.com/products/item", {
      enabled: true,
      render: async () => browserSnapshot,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.data.viewport).toEqual({
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
    });
    expect(result.data.userAgent).toContain("Mobile");
    expect(result.data.checks.length).toBeGreaterThan(10);
    expect(result.data.signals.some((signal) => signal.status === "detected")).toBe(
      true,
    );
    expect(result.data.limitations.join(" ")).toContain("heuristic");
    expect(result.data.screenshot?.width).toBe(390);
  });

  it("keeps a successful scan usable when the screenshot was skipped", async () => {
    const result = await runRenderedAudit("https://store.com/products/item", {
      enabled: true,
      render: async () => ({
        snapshot: snapshot(),
        screenshot: null,
        finalUrl: "https://store.com/products/item",
        proxyStats: { connections: 1, bytes: 500, blocked: 0 },
      }),
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.screenshot).toBeNull();
  });
});

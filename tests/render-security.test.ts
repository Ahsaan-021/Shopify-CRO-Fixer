import { createServer, request as httpRequest } from "node:http";
import { describe, expect, it } from "vitest";
import { checkTarget } from "@/lib/audit/render/network-guard";
import { startSecureProxy } from "@/lib/audit/render/proxy";

function resolver(map: Record<string, string[]>) {
  return async (hostname: string) => map[hostname] ?? [];
}

describe("rendered request destination guard", () => {
  it("pins an allowed public hostname to the validated address", async () => {
    const decision = await checkTarget("https://store.com/products/item", {
      resolver: resolver({ "store.com": ["93.184.216.34"] }),
    });

    expect(decision).toMatchObject({
      ok: true,
      hostname: "store.com",
      port: 443,
      address: "93.184.216.34",
      family: 4,
    });
  });

  it.each([
    "http://127.0.0.1/",
    "http://10.0.0.5/",
    "http://192.168.1.10/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://[fd00::1]/",
  ])("blocks private, loopback, and metadata address %s", async (url) => {
    expect(await checkTarget(url)).toMatchObject({
      ok: false,
      reason: "private-address",
    });
  });

  it("blocks a hostname if any DNS answer is private", async () => {
    const decision = await checkTarget("https://mixed.com/", {
      resolver: resolver({
        "mixed.com": ["93.184.216.34", "127.0.0.1"],
      }),
    });

    expect(decision).toMatchObject({ ok: false, reason: "private-address" });
  });

  it.each([
    ["file:///etc/passwd", "blocked-scheme"],
    ["data:text/html,<h1>x</h1>", "blocked-scheme"],
    ["ftp://store.com/file", "blocked-scheme"],
    ["ws://store.com/socket", "blocked-scheme"],
    ["https://user:pass@store.com/", "blocked-credentials"],
    ["https://store.com:8443/", "blocked-port"],
    ["http://localhost/", "blocked-hostname"],
    ["http://printer.local/", "blocked-hostname"],
  ])("blocks %s", async (url, reason) => {
    expect(await checkTarget(url)).toMatchObject({ ok: false, reason });
  });

  it("revalidates a redirect target and blocks an internal destination", async () => {
    const publicRedirect = await checkTarget("https://store.com/next", {
      resolver: resolver({ "store.com": ["93.184.216.34"] }),
    });
    expect(publicRedirect.ok).toBe(true);

    const internalRedirect = await checkTarget("http://169.254.169.254/", {
      resolver: resolver({}),
    });
    expect(internalRedirect).toMatchObject({
      ok: false,
      reason: "private-address",
    });
  });

  it("fails closed when DNS fails or returns no address", async () => {
    expect(
      await checkTarget("https://missing.com/", {
        resolver: async () => {
          throw new Error("dns failure");
        },
      }),
    ).toMatchObject({ ok: false, reason: "dns-failed" });

    expect(
      await checkTarget("https://empty.com/", {
        resolver: resolver({}),
      }),
    ).toMatchObject({ ok: false, reason: "dns-failed" });
  });
});

describe("rendered allow-listing proxy", () => {
  it("refuses a proxied request that resolves to a private address", async () => {
    const proxy = await startSecureProxy({
      resolver: async () => ["127.0.0.1"],
    });

    try {
      const status = await new Promise<number>((resolve, reject) => {
        const request = httpRequest(
          {
            host: "127.0.0.1",
            port: Number(new URL(proxy.url).port),
            method: "GET",
            path: "http://evil.com/",
          },
          (response) => {
            response.resume();
            resolve(response.statusCode ?? 0);
          },
        );
        request.on("error", reject);
        request.end();
      });

      expect(status).toBe(403);
      expect(proxy.stats().blocked).toBeGreaterThan(0);
    } finally {
      await proxy.close();
    }
  });

  it("refuses CONNECT tunnels to private addresses", async () => {
    const proxy = await startSecureProxy({
      resolver: async () => ["10.0.0.8"],
    });

    try {
      const status = await new Promise<number>((resolve, reject) => {
        const request = httpRequest({
          host: "127.0.0.1",
          port: Number(new URL(proxy.url).port),
          method: "CONNECT",
          path: "internal.com:443",
        });
        request.on("connect", (response, socket) => {
          socket.destroy();
          resolve(response.statusCode ?? 0);
        });
        request.on("response", (response) => {
          response.resume();
          resolve(response.statusCode ?? 0);
        });
        request.on("error", reject);
        request.end();
      });

      expect(status).toBe(403);
    } finally {
      await proxy.close();
    }
  });

  it("only forwards GET, HEAD, and OPTIONS", async () => {
    const proxy = await startSecureProxy({
      resolver: async () => ["93.184.216.34"],
    });

    try {
      const status = await new Promise<number>((resolve, reject) => {
        const request = httpRequest(
          {
            host: "127.0.0.1",
            port: Number(new URL(proxy.url).port),
            method: "POST",
            path: "https://store.com/cart/add",
          },
          (response) => {
            response.resume();
            resolve(response.statusCode ?? 0);
          },
        );
        request.on("error", reject);
        request.end("x");
      });

      expect(status).toBe(405);
    } finally {
      await proxy.close();
    }
  });
});

describe("rendered proxy lifecycle", () => {
  it("closes its local listener without leaving a server open", async () => {
    const proxy = await startSecureProxy({
      resolver: async () => ["93.184.216.34"],
    });
    const port = Number(new URL(proxy.url).port);

    await proxy.close();

    const stillListening = await new Promise<boolean>((resolve) => {
      const probe = createServer();
      probe.once("error", () => resolve(true));
      probe.listen(port, "127.0.0.1", () => {
        probe.close(() => resolve(false));
      });
    });

    expect(stillListening).toBe(false);
  });
});

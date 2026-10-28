import { existsSync } from "node:fs";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import {
  MOBILE_USER_AGENT,
  RENDERED_LIMITS,
  RENDERED_VIEWPORT,
} from "@/lib/audit/render/config";
import { RenderFailure } from "@/lib/audit/render/errors";
import {
  extractSnapshot,
  type RenderedSnapshot,
} from "@/lib/audit/render/extract";
import { startSecureProxy } from "@/lib/audit/render/proxy";
import { MARKER_SELECTORS } from "@/lib/audit/render/signals";
import { sanitiseSnapshot } from "@/lib/audit/render/validate";
import type { RenderedScreenshot } from "@/lib/audit/types";

const LOCAL_CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

const MAX_NAVIGATIONS = 4;

function localChromePath() {
  const configured = process.env.CHROME_EXECUTABLE_PATH?.trim();
  if (configured && existsSync(configured)) return configured;
  return LOCAL_CHROME_PATHS.find((candidate) => existsSync(candidate));
}

/**
 * Logs a short, safe diagnostic. It is server-only, never returns to the
 * client, and records only the error class and a bounded message. Messages can
 * contain file paths from the serverless runtime, but no page content, API
 * keys, or visitor data.
 */
function logBrowserDiagnostic(stage: string, error: unknown) {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `[render] ${stage} failed { name: ${name}, message: ${message.slice(0, 300)} }`,
  );
}

async function resolveExecutable() {
  const local = localChromePath();
  if (local) return { executablePath: local, headless: true as const, args: [] };

  try {
    const { default: chromium } = await import("@sparticuz/chromium");
    // Screenshots and layout measurements do not need WebGL, so skip the
    // SwiftShader extraction and its memory cost.
    chromium.setGraphicsMode = false;
    const executablePath = await chromium.executablePath("/tmp");
    return {
      executablePath,
      headless: true as const,
      args: chromium.args,
    };
  } catch (error) {
    logBrowserDiagnostic("chromium extraction", error);
    throw new RenderFailure(
      "NO_BROWSER",
      "Rendered scanning is unavailable because no browser could be started on the server.",
    );
  }
}

function classifyRenderError(error: unknown): RenderFailure {
  if (error instanceof RenderFailure) return error;
  const message = error instanceof Error ? error.message : "";

  if (/timeout|timed out|navigation timeout/i.test(message)) {
    return new RenderFailure(
      "TIMEOUT",
      "The rendered scan took too long to finish, so the static findings are still shown.",
    );
  }

  if (/ERR_BLOCKED_BY_CLIENT|blocked by client/i.test(message)) {
    return new RenderFailure(
      "BLOCKED",
      "A request was blocked by the rendered-scan security rules or by the store.",
    );
  }

  if (
    /ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_TUNNEL|ERR_PROXY|net::/i.test(
      message,
    )
  ) {
    return new RenderFailure(
      "BLOCKED",
      "The rendered page could not be reached through the security proxy.",
    );
  }

  return new RenderFailure(
    "ERROR",
    "The rendered scan could not complete, so the static findings are still shown.",
  );
}

async function captureScreenshot(page: Page): Promise<RenderedScreenshot | null> {
  for (const quality of [45, 35, 28, 20]) {
    try {
      const encoded = await page.screenshot({
        type: "jpeg",
        quality,
        encoding: "base64",
        captureBeyondViewport: false,
        fullPage: false,
      });

      if (typeof encoded !== "string") continue;
      const bytes = Buffer.from(encoded, "base64");
      if (bytes.length > RENDERED_LIMITS.screenshotMaxBytes) continue;

      return {
        mime: "image/jpeg",
        base64: encoded,
        width: RENDERED_VIEWPORT.width,
        height: RENDERED_VIEWPORT.height,
        bytes: bytes.length,
      };
    } catch {
      return null;
    }
  }

  return null;
}

export type BrowserSnapshot = {
  snapshot: RenderedSnapshot;
  screenshot: RenderedScreenshot | null;
  finalUrl: string;
  proxyStats: { connections: number; bytes: number; blocked: number };
};

/**
 * Renders one mobile product page in a fresh, isolated browser. All HTTP(S)
 * traffic is forced through the allow-listing proxy. The browser only reads
 * layout and text through one fixed evaluate script. The browser and proxy are
 * always closed.
 */
export async function renderPageSnapshot(
  url: string,
): Promise<BrowserSnapshot> {
  const proxy = await startSecureProxy({
    maxBytes: RENDERED_LIMITS.maxBytes,
    maxConnections: RENDERED_LIMITS.maxConnections,
  }).catch(() => {
    throw new RenderFailure(
      "ERROR",
      "The rendered-scan network guard could not start.",
    );
  });

  let browser: Browser | null = null;

  try {
    const executable = await resolveExecutable();

    browser = await puppeteer
      .launch({
        executablePath: executable.executablePath,
        headless: executable.headless,
        timeout: 20_000,
        args: [
          ...executable.args,
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-quic",
          "--disable-notifications",
          "--disable-geolocation",
          "--disable-background-timer-throttling",
          "--disable-renderer-backgrounding",
          "--mute-audio",
          "--no-first-run",
          "--no-default-browser-check",
          `--proxy-server=${proxy.url}`,
          "--proxy-bypass-list=<-loopback>",
          "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
          "--disable-features=WebRtcHideLocalIpsWithMdns,MediaRouter,OptimizationHints",
        ],
        defaultViewport: RENDERED_VIEWPORT,
      })
      .catch((error) => {
        logBrowserDiagnostic("browser launch", error);
        throw new RenderFailure(
          "NO_BROWSER",
          "Rendered scanning is unavailable because no browser could be started on the server.",
        );
      });

    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    browser.on("targetcreated", (target) => {
      if (target.type() === "page" && target !== page.target()) {
        void target
          .page()
          .then((newPage) => newPage?.close())
          .catch(() => {});
      }
    });

    await page.setViewport(RENDERED_VIEWPORT);
    await page.setUserAgent(MOBILE_USER_AGENT);
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);

    await context
      .overridePermissions(new URL(url).origin, [])
      .catch(() => {});

    const cdp = await page.createCDPSession();
    await cdp
      .send("Page.setDownloadBehavior", { behavior: "deny" })
      .catch(() => {});

    await page.evaluateOnNewDocument(() => {
      const block = () => {
        throw new Error("Blocked by rendered audit");
      };
      // WebSockets, EventSource, and WebRTC are not needed to read a product
      // page and could open uncontrolled network paths.
      Object.defineProperty(window, "WebSocket", {
        configurable: false,
        value: class {
          constructor() {
            block();
          }
        },
      });
      Object.defineProperty(window, "EventSource", {
        configurable: false,
        value: class {
          constructor() {
            block();
          }
        },
      });
      Object.defineProperty(window, "RTCPeerConnection", {
        configurable: false,
        value: class {
          constructor() {
            block();
          }
        },
      });
    });

    page.on("dialog", (dialog) => {
      void dialog.dismiss().catch(() => {});
    });

    await page.setRequestInterception(true);

    let requestCount = 0;
    let navigationCount = 0;

    page.on("request", (request) => {
      try {
        const requestUrl = request.url();
        const scheme = requestUrl.split(":", 1)[0].toLowerCase();

        if (
          scheme === "file" ||
          scheme === "ftp" ||
          scheme === "ws" ||
          scheme === "wss" ||
          scheme === "blob"
        ) {
          void request.abort("blockedbyclient").catch(() => {});
          return;
        }

        if (request.isNavigationRequest()) {
          navigationCount += 1;
          if (
            navigationCount > MAX_NAVIGATIONS ||
            (scheme !== "http" && scheme !== "https")
          ) {
            void request.abort("blockedbyclient").catch(() => {});
            return;
          }
        }

        requestCount += 1;
        if (requestCount > RENDERED_LIMITS.maxRequests) {
          void request.abort("blockedbyclient").catch(() => {});
          return;
        }

        const method = request.method().toUpperCase();
        if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
          void request.abort("blockedbyclient").catch(() => {});
          return;
        }

        void request.continue().catch(() => {});
      } catch {
        void request.abort("blockedbyclient").catch(() => {});
      }
    });

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: RENDERED_LIMITS.navigationTimeoutMs,
    });

    if (!response) {
      throw new RenderFailure(
        "BLOCKED",
        "The rendered page did not return a response.",
      );
    }

    await page
      .waitForNetworkIdle({
        idleTime: 1_200,
        timeout: RENDERED_LIMITS.networkIdleMs,
      })
      .catch(() => {});

    await new Promise((resolve) =>
      setTimeout(resolve, RENDERED_LIMITS.settleMs),
    );

    const finalUrl = page.url();
    if (!/^https?:\/\//i.test(finalUrl)) {
      throw new RenderFailure(
        "BLOCKED",
        "The rendered page ended on an address that cannot be audited.",
      );
    }

    const screenshot = await captureScreenshot(page);

    const raw = await page.evaluate(extractSnapshot, {
      maxTextBlocks: RENDERED_LIMITS.maxTextBlocks,
      maxButtons: RENDERED_LIMITS.maxButtons,
      markers: Object.entries(MARKER_SELECTORS).map(([id, selectors]) => ({
        id,
        selectors,
      })),
    });

    const snapshot = sanitiseSnapshot(raw);
    if (!snapshot) {
      throw new RenderFailure(
        "ERROR",
        "The rendered page returned data this audit could not read safely.",
      );
    }

    return {
      snapshot: { ...snapshot, finalUrl: snapshot.finalUrl || finalUrl },
      screenshot,
      finalUrl,
      proxyStats: proxy.stats(),
    };
  } catch (error) {
    throw classifyRenderError(error);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    await proxy.close().catch(() => {});
  }
}

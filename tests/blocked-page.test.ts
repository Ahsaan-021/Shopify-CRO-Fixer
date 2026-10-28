import { describe, expect, it } from "vitest";
import { detectBlockedPage } from "@/lib/audit/blocked-page";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function fixture(name: string) {
  return readFileSync(join(process.cwd(), "tests", "fixtures", name), "utf8");
}

describe("detectBlockedPage", () => {
  it("detects a Cloudflare challenge page", () => {
    expect(detectBlockedPage(fixture("cloudflare-challenge.html"))).toEqual({
      reason: "bot-protection",
      message:
        "The store's bot protection blocked the scan. Try again later or from a different network.",
    });
  });

  it("detects a Shopify password page", () => {
    expect(detectBlockedPage(fixture("shopify-password.html"))).toEqual({
      reason: "password-page",
      message:
        "This storefront is password-protected. The scanner only audits public pages.",
    });
  });

  it("detects a Vercel security checkpoint", () => {
    expect(
      detectBlockedPage(
        "<html><head><title>Vercel Security Checkpoint</title></head><body></body></html>",
      )?.reason,
    ).toBe("bot-protection");
  });

  it("does not flag normal pages", () => {
    expect(detectBlockedPage(fixture("product-page.html"))).toBeNull();
    expect(detectBlockedPage(fixture("general-page.html"))).toBeNull();
    expect(detectBlockedPage(fixture("minimal-page.html"))).toBeNull();
  });

  it("does not treat an ordinary mention of a captcha as a challenge page", () => {
    expect(
      detectBlockedPage(
        "<html><body><p>Our contact form uses a captcha.</p></body></html>",
      ),
    ).toBeNull();
  });

  it("does not treat a single generic phrase as a challenge page", () => {
    expect(
      detectBlockedPage(
        "<html><body><p>Our checkout takes just a moment...</p></body></html>",
      ),
    ).toBeNull();
  });

  it("is case-insensitive and only inspects the start of a large document", () => {
    expect(
      detectBlockedPage(
        `<html><head><script src="/CDN-CGI/CHALLENGE-PLATFORM/h/b.js"></script></head><body>${"x".repeat(400_000)}</body></html>`,
      )?.reason,
    ).toBe("bot-protection");
  });
});

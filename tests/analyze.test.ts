import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzePage } from "@/lib/audit/analyze";
import type { AuditCheck } from "@/lib/audit/types";

function fixture(name: string) {
  return readFileSync(join(process.cwd(), "tests", "fixtures", name), "utf8");
}

function analyze(
  name: string,
  finalUrl: string,
  httpStatus = 200,
) {
  return analyzePage({
    html: fixture(name),
    finalUrl,
    httpStatus,
    bytes: 0,
    xRobotsTag: "",
  });
}

function getCheck(checks: AuditCheck[], id: string) {
  const check = checks.find((candidate) => candidate.id === id);
  if (!check) throw new Error(`Expected a check with id "${id}"`);
  return check;
}

describe("analyzePage with a product page fixture", () => {
  const result = analyze(
    "product-page.html",
    "https://northlinegear.com/products/trail-runner-2",
  );

  it("reports the actual HTTP status, title, and canonical URL", () => {
    expect(getCheck(result.checks, "http-status")).toMatchObject({
      status: "pass",
      evidence: ["HTTP status: 200"],
    });
    expect(result.title).toBe("Trail Runner 2 | Northline");
    expect(result.canonicalUrl).toBe(
      "https://northlinegear.com/products/trail-runner-2",
    );
    expect(getCheck(result.checks, "canonical-url").status).toBe("pass");
  });

  it("detects product signals without claiming guaranteed Shopify identification", () => {
    expect(result.pageType).toBe("product");
    expect(result.pageTypeEvidence).toContain("URL contains /products/");
    expect(result.pageTypeEvidence).toContain("Product JSON-LD is present");

    const productCheck = getCheck(result.checks, "product-page");
    expect(productCheck.status).toBe("pass");
    expect(productCheck.evidence.join(" ")).toContain("Product JSON-LD");
    expect(productCheck.evidence.join(" ")).toContain(
      "standard add-to-cart",
    );
  });

  it("counts every check exactly once with no invented score", () => {
    const summary = {
      passed: result.checks.filter((check) => check.status === "pass").length,
      warnings: result.checks.filter((check) => check.status === "warning")
        .length,
      failed: result.checks.filter((check) => check.status === "fail").length,
      notChecked: result.checks.filter(
        (check) => check.status === "not-checked",
      ).length,
    };

    expect(summary).toEqual({
      passed: 11,
      warnings: 0,
      failed: 0,
      notChecked: 3,
    });
    expect(
      summary.passed + summary.warnings + summary.failed + summary.notChecked,
    ).toBe(result.checks.length);
    expect(result.checks).toHaveLength(14);
    expect(result.verdict).toBe("no-obvious-issues");
  });
});

describe("analyzePage with a minimal page fixture", () => {
  const result = analyze("minimal-page.html", "https://minimal-store.com/");

  it("reports missing signals honestly", () => {
    expect(getCheck(result.checks, "page-title").status).toBe("warning");
    expect(getCheck(result.checks, "meta-description").status).toBe("warning");
    expect(getCheck(result.checks, "main-heading").status).toBe("fail");
    expect(getCheck(result.checks, "mobile-viewport")).toMatchObject({
      status: "fail",
      severity: "high",
    });
    expect(getCheck(result.checks, "page-language").status).toBe("warning");
    expect(getCheck(result.checks, "indexability").status).toBe("fail");
  });

  it("marks checks it cannot perform as unverified rather than passing or failing them", () => {
    expect(getCheck(result.checks, "canonical-url").status).toBe("not-checked");
    expect(getCheck(result.checks, "product-page").status).toBe("not-checked");
    expect(getCheck(result.checks, "trust-signals").status).toBe("not-checked");
    expect(getCheck(result.checks, "mobile-experience").status).toBe(
      "not-checked",
    );
    expect(getCheck(result.checks, "performance").status).toBe("not-checked");
    expect(getCheck(result.checks, "checkout-confidence").status).toBe(
      "not-checked",
    );
    expect(result.pageType).toBe("other");
  });

  it("uses the actual image alt coverage from the fixture", () => {
    const altCheck = getCheck(result.checks, "image-alt");
    expect(altCheck.status).toBe("fail");
    expect(altCheck.evidence.join(" ")).toContain("100%");
    expect(altCheck.evidence.join(" ")).toContain("1 <img> element missing alt");
  });

  it("reports a major-issues verdict with a consistent summary", () => {
    expect(result.verdict).toBe("major-issues");
    expect(result.checks).toHaveLength(14);
    expect(
      result.checks.filter((check) => check.status === "not-checked"),
    ).toHaveLength(6);
  });
});

describe("canonical URL parsing", () => {
  function pageWithCanonical(rel: string, href: string) {
    return `<!doctype html>
      <html lang="en">
        <head>
          <title>Canonical test page</title>
          <meta name="description" content="A reasonably sized meta description used only to keep this parser test focused on canonical URL behaviour." />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="${rel}" href="${href}" />
        </head>
        <body><h1>Canonical test page</h1></body>
      </html>`;
  }

  function analyzeHtml(html: string) {
    return analyzePage({
      html,
      finalUrl: "https://northlinegear.com/products/trail-runner-2",
      httpStatus: 200,
      bytes: 0,
      xRobotsTag: "",
    });
  }

  it("resolves a relative canonical href against the final URL", () => {
    const result = analyze("general-page.html", "https://northlinegear.com/about");
    expect(getCheck(result.checks, "canonical-url").status).toBe("pass");
    expect(result.canonicalUrl).toBe("https://northlinegear.com/about");
  });

  it("matches the canonical rel attribute case-insensitively", () => {
    const result = analyzeHtml(
      pageWithCanonical(
        "Alternate Canonical",
        "https://northlinegear.com/products/trail-runner-2",
      ),
    );
    expect(getCheck(result.checks, "canonical-url").status).toBe("pass");
  });

  it("warns when the canonical points at another host", () => {
    const result = analyzeHtml(
      pageWithCanonical(
        "canonical",
        "https://other-store.example/products/trail-runner-2",
      ),
    );
    const canonical = getCheck(result.checks, "canonical-url");
    expect(canonical.status).toBe("warning");
    expect(canonical.severity).toBe("low");
    expect(canonical.evidence.join(" ")).toContain("other-store.example");
  });

  it("warns about a non-HTTP canonical without executing it", () => {
    const result = analyzeHtml(
      pageWithCanonical("canonical", "javascript:alert(1)"),
    );
    const canonical = getCheck(result.checks, "canonical-url");
    expect(canonical.status).toBe("warning");
    expect(result.canonicalUrl).toBeNull();
    expect(canonical.evidence.join(" ")).toContain("javascript:alert(1)");
  });
});

describe("HTTP status reporting", () => {
  it("fails the HTTP check for a non-success status", () => {
    const result = analyze("minimal-page.html", "https://minimal-store.com/", 503);
    const httpCheck = getCheck(result.checks, "http-status");
    expect(httpCheck.status).toBe("fail");
    expect(httpCheck.severity).toBe("high");
    expect(httpCheck.evidence).toContain("HTTP status: 503");
  });
});

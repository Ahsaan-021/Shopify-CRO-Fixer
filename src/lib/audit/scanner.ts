import { analyzePage } from "@/lib/audit/analyze";
import { AuditScanError } from "@/lib/audit/errors";
import { fetchPublicHtml } from "@/lib/audit/fetch-page";
import { summariseChecks } from "@/lib/audit/summary";
import type { AuditReport } from "@/lib/audit/types";
import { validateAuditUrl } from "@/lib/audit/validation";

const TOTAL_AUDIT_TIMEOUT_MS = 15_000;

export async function runLiveAudit(rawUrl: string): Promise<AuditReport> {
  const validation = validateAuditUrl(rawUrl);
  if (!validation.ok) {
    throw new AuditScanError("INVALID_URL", validation.message, 400);
  }

  const startedAt = Date.now();
  const deadline = startedAt + TOTAL_AUDIT_TIMEOUT_MS;
  const page = await fetchPublicHtml(validation.url, deadline);
  const analysis = analyzePage({
    html: page.html,
    finalUrl: page.finalUrl,
    httpStatus: page.status,
    bytes: page.bytes,
    xRobotsTag: page.xRobotsTag,
  });

  const summary = summariseChecks(analysis.checks);

  const verdict = analysis.verdict;

  return {
    schemaVersion: 1,
    mode: "live",
    requestedUrl: validation.url,
    finalUrl: page.finalUrl,
    scannedAt: new Date().toISOString(),
    httpStatus: page.status,
    pageType: analysis.pageType,
    pageTypeEvidence: analysis.pageTypeEvidence,
    document: {
      bytes: page.bytes,
      title: analysis.title,
      canonicalUrl: analysis.canonicalUrl,
    },
    redirects: page.redirects,
    verdict,
    summary,
    checks: analysis.checks,
    limitations: [
      "Only the initial HTML of one page was inspected. JavaScript-rendered content was not executed.",
      "No speed, Core Web Vitals, real-device layout, interaction, add-to-cart, or checkout tests were run.",
      "A passing check means a signal was present. It does not prove that the page converts well.",
      "Shopify themes and apps can change markup after load, so verify important findings in a real browser.",
    ],
  };
}

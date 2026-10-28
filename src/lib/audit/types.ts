export type AuditCategory =
  | "content"
  | "product"
  | "mobile"
  | "trust"
  | "technical";

export type AuditCheckStatus = "pass" | "warning" | "fail" | "not-checked";

export type AuditErrorCode =
  | "INVALID_URL"
  | "UNSAFE_TARGET"
  | "DNS_FAILED"
  | "DNS_TIMEOUT"
  | "TIMEOUT"
  | "TOO_MANY_REDIRECTS"
  | "RESPONSE_TOO_LARGE"
  | "UNSUPPORTED_CONTENT"
  | "UNSUPPORTED_ENCODING"
  | "INVALID_RESPONSE"
  | "HTTP_ERROR"
  | "BLOCKED_BY_SITE"
  | "TLS_ERROR"
  | "CONNECTION_ERROR"
  | "UPSTREAM_ERROR"
  | "RATE_LIMITED"
  | "INVALID_REQUEST"
  | "INTERNAL_ERROR";

export type AuditSeverity = "none" | "low" | "medium" | "high" | "unknown";

export type AuditVerdict =
  | "no-obvious-issues"
  | "needs-attention"
  | "major-issues"
  | "limited";

export type AuditPriority = "high" | "medium" | "low";

export type AuditEffort = "easy" | "moderate" | "advanced";

export interface AuditSnippet {
  label: string;
  language: "liquid" | "html";
  code: string;
}

export interface AuditCheck {
  id: string;
  title: string;
  category: AuditCategory;
  status: AuditCheckStatus;
  severity: AuditSeverity;
  summary: string;
  evidence: string[];
  recommendation?: string;
  /** Rule-based editorial priority. Never a predicted conversion lift. */
  priority?: AuditPriority;
  /** Editorial estimate of the work involved. */
  effort?: AuditEffort;
  fixSteps?: string[];
  snippet?: AuditSnippet;
}

export interface AuditSummary {
  passed: number;
  warnings: number;
  failed: number;
  notChecked: number;
}

export interface AuditRedirect {
  from: string;
  to: string;
  status: number;
}

export type ProductJsonStatus =
  | { status: "checked"; reason?: undefined }
  | { status: "unavailable" | "skipped"; reason: string };

export interface FixPlanItem {
  checkId: string;
  title: string;
  category: AuditCategory;
  priority: AuditPriority;
  effort: AuditEffort;
  summary: string;
  steps: string[];
  snippet?: AuditSnippet;
}

export interface AuditReport {
  schemaVersion: 2;
  mode: "live";
  requestedUrl: string;
  finalUrl: string;
  scannedAt: string;
  httpStatus: number;
  pageType: "product" | "other";
  pageTypeEvidence: string;
  document: {
    bytes: number;
    title: string | null;
    canonicalUrl: string | null;
  };
  redirects: AuditRedirect[];
  productJson: ProductJsonStatus;
  verdict: AuditVerdict;
  summary: AuditSummary;
  fixPlan: FixPlanItem[];
  checks: AuditCheck[];
  limitations: string[];
}

export interface AuditErrorPayload {
  error: {
    code: AuditErrorCode;
    message: string;
    retryAfterSeconds?: number;
    upstreamStatus?: number;
  };
}

export type SpeedUnavailableCode =
  | "QUOTA"
  | "TIMEOUT"
  | "UPSTREAM"
  | "MALFORMED";

export interface SpeedOpportunity {
  title: string;
  displayValue: string | null;
  description: string | null;
}

export interface SpeedData {
  source: "Google PageSpeed Insights (lab data)";
  strategy: "mobile";
  fetchedAt: string;
  performanceScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  inpMs: number | null;
  opportunities: SpeedOpportunity[];
  diagnostics: SpeedOpportunity[];
}

export type SpeedResult =
  | { status: "ok"; data: SpeedData }
  | {
      status: "unavailable";
      code: SpeedUnavailableCode;
      message: string;
    };

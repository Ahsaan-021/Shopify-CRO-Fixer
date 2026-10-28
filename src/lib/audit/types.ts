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

export interface AuditCheck {
  id: string;
  title: string;
  category: AuditCategory;
  status: AuditCheckStatus;
  severity: AuditSeverity;
  summary: string;
  evidence: string[];
  recommendation?: string;
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

export interface AuditReport {
  schemaVersion: 1;
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
  verdict: AuditVerdict;
  summary: AuditSummary;
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

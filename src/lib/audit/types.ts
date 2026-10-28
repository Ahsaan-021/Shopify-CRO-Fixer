export type AuditCategory =
  | "above-fold"
  | "trust"
  | "offers"
  | "social-proof"
  | "product-content"
  | "mobile"
  | "product"
  | "content"
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
  | "INTERNAL_ERROR"
  | "RENDER_DISABLED"
  | "RENDER_UNAVAILABLE"
  | "RENDER_TIMEOUT";

export type AuditSeverity = "none" | "low" | "medium" | "high" | "unknown";

export type AuditVerdict =
  | "no-obvious-issues"
  | "needs-attention"
  | "major-issues"
  | "limited";

export type AuditPriority = "high" | "medium" | "low";

export type AuditEffort = "easy" | "moderate" | "advanced";

export type AuditSource =
  | "static-html"
  | "product-json"
  | "rendered"
  | "pagespeed";

export interface AuditSnippet {
  label: string;
  language: "liquid" | "html" | "css" | "javascript";
  code: string;
}

export interface AuditDeveloperTrack {
  steps: string[];
  snippet?: AuditSnippet;
}

export interface AuditFixTracks {
  storeOwner: string[];
  developer: AuditDeveloperTrack;
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
  /** Short, non-numeric explanation of why the finding matters. */
  whyItMatters?: string;
  /** Separate guidance for store owners and theme developers. */
  fixTracks?: AuditFixTracks;
  source?: AuditSource;
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
  schemaVersion: 3;
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
  | "NO_KEY"
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

export type RenderedSignalGroup =
  | "trust"
  | "shipping-returns"
  | "social-proof"
  | "offers"
  | "urgency"
  | "product-content"
  | "support"
  | "accelerated-checkout";

export type RenderedSignalStatus = "detected" | "not-detected" | "unable";

export type RenderedLocation =
  | "above-fold"
  | "near-buy-box"
  | "below-fold"
  | "footer-only"
  | "page-wide"
  | "not-found";

export interface RenderedSignal {
  id: string;
  group: RenderedSignalGroup;
  label: string;
  status: RenderedSignalStatus;
  evidence: string;
  location: RenderedLocation;
}

export interface RenderedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderedMetrics {
  scrollWidth: number;
  viewportWidth: number;
  pageHeight: number;
  titleText: string | null;
  priceText: string | null;
  compareAtText: string | null;
  titleRect: RenderedRect | null;
  priceRect: RenderedRect | null;
  addToCartRect: RenderedRect | null;
  addToCartLabel: string | null;
  titleAboveFold: boolean;
  priceAboveFold: boolean;
  addToCartAboveFold: boolean;
  stickyAddToCartDetected: boolean;
  stickyAddToCartLabel: string | null;
  productImageCount: number;
  productImagesWithAlt: number;
  videoDetected: boolean;
  variantSelectorDetected: boolean;
  variantPreselected: boolean | null;
  discountBadgeDetected: boolean;
  discountBadgeText: string | null;
  overlayCoverage: number;
  overlayText: string | null;
  horizontalOverflow: boolean;
}

export interface RenderedScreenshot {
  mime: "image/jpeg";
  base64: string;
  width: number;
  height: number;
  bytes: number;
}

export interface RenderedAudit {
  scannedAt: string;
  durationMs: number;
  requestedUrl: string;
  finalUrl: string;
  viewport: { width: 390; height: 844; deviceScaleFactor: 1 };
  userAgent: string;
  screenshot: RenderedScreenshot | null;
  metrics: RenderedMetrics;
  signals: RenderedSignal[];
  checks: AuditCheck[];
  limitations: string[];
}

export type RenderedUnavailableCode =
  | "DISABLED"
  | "NO_BROWSER"
  | "TIMEOUT"
  | "BLOCKED"
  | "UNSAFE_TARGET"
  | "RATE_LIMITED"
  | "ERROR";

export type RenderedResult =
  | { status: "ok"; data: RenderedAudit }
  | {
      status: "unavailable";
      code: RenderedUnavailableCode;
      message: string;
    };

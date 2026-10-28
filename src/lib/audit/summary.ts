import type { AuditCheck, AuditSummary } from "@/lib/audit/types";

/**
 * Counts the checks that actually ran. This is deliberately a simple count of
 * statuses: no weighted score is calculated or implied.
 */
export function summariseChecks(checks: AuditCheck[]): AuditSummary {
  return checks.reduce<AuditSummary>(
    (summary, check) => {
      if (check.status === "pass") summary.passed += 1;
      if (check.status === "warning") summary.warnings += 1;
      if (check.status === "fail") summary.failed += 1;
      if (check.status === "not-checked") summary.notChecked += 1;
      return summary;
    },
    { passed: 0, warnings: 0, failed: 0, notChecked: 0 },
  );
}

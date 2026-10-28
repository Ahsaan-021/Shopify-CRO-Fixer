import { describe, expect, it } from "vitest";
import { summariseChecks } from "@/lib/audit/summary";
import type { AuditCheck } from "@/lib/audit/types";

function check(
  id: string,
  status: AuditCheck["status"],
  severity: AuditCheck["severity"],
): AuditCheck {
  return {
    id,
    title: id,
    category: "technical",
    status,
    severity,
    summary: "",
    evidence: [],
  };
}

describe("summariseChecks", () => {
  it("counts each status exactly once", () => {
    const summary = summariseChecks([
      check("a", "pass", "none"),
      check("b", "pass", "none"),
      check("c", "warning", "low"),
      check("d", "fail", "medium"),
      check("e", "not-checked", "unknown"),
    ]);

    expect(summary).toEqual({
      passed: 2,
      warnings: 1,
      failed: 1,
      notChecked: 1,
    });
  });

  it("returns zeroes for an empty check list", () => {
    expect(summariseChecks([])).toEqual({
      passed: 0,
      warnings: 0,
      failed: 0,
      notChecked: 0,
    });
  });
});

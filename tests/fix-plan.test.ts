import { describe, expect, it } from "vitest";
import {
  applyFixPlan,
  buildFixPlan,
  effortFor,
  priorityFor,
} from "@/lib/audit/fix-plan";
import type { AuditCheck } from "@/lib/audit/types";

function check(overrides: Partial<AuditCheck>): AuditCheck {
  return {
    id: "test-check",
    title: "Test check",
    category: "content",
    status: "warning",
    severity: "low",
    summary: "Test summary",
    evidence: ["Test evidence"],
    ...overrides,
  };
}

describe("priorityFor", () => {
  it("uses the documented deterministic rules", () => {
    expect(priorityFor(check({ status: "fail", severity: "high" }))).toBe(
      "high",
    );
    expect(priorityFor(check({ status: "fail", severity: "medium" }))).toBe(
      "high",
    );
    expect(priorityFor(check({ status: "fail", severity: "low" }))).toBe(
      "medium",
    );
    expect(priorityFor(check({ status: "warning", severity: "high" }))).toBe(
      "medium",
    );
    expect(priorityFor(check({ status: "warning", severity: "medium" }))).toBe(
      "medium",
    );
    expect(priorityFor(check({ status: "warning", severity: "low" }))).toBe(
      "low",
    );
  });

  it("does not prioritise passed or unverified checks", () => {
    expect(priorityFor(check({ status: "pass", severity: "none" }))).toBe(
      undefined,
    );
    expect(
      priorityFor(check({ status: "not-checked", severity: "unknown" })),
    ).toBe(undefined);
  });
});

describe("effortFor", () => {
  it("uses editorial effort ratings by check type", () => {
    expect(effortFor(check({ id: "page-title" }))).toBe("easy");
    expect(effortFor(check({ id: "product-page" }))).toBe("moderate");
    expect(effortFor(check({ id: "performance" }))).toBe("advanced");
    expect(
      effortFor(check({ id: "unknown-check", category: "technical" })),
    ).toBe("moderate");
  });
});

describe("applyFixPlan", () => {
  it("adds priority, effort, Shopify steps, and a labelled snippet", () => {
    const result = applyFixPlan(
      check({ id: "image-alt", status: "warning", severity: "low" }),
    );

    expect(result.priority).toBe("low");
    expect(result.effort).toBe("easy");
    expect(result.fixSteps?.length).toBeGreaterThan(0);
    expect(result.snippet?.label).toContain("adapt to your theme");
    expect(result.snippet?.language).toBe("liquid");
  });

  it("leaves passed and unverified checks unchanged", () => {
    const passed = check({ status: "pass", severity: "none" });
    const unverified = check({ status: "not-checked", severity: "unknown" });

    expect(applyFixPlan(passed)).toEqual(passed);
    expect(applyFixPlan(unverified)).toEqual(unverified);
  });
});

describe("buildFixPlan", () => {
  const checks = [
    check({
      id: "low-warning",
      title: "Low warning",
      status: "warning",
      severity: "low",
    }),
    check({
      id: "high-failure",
      title: "High failure",
      status: "fail",
      severity: "high",
    }),
    check({
      id: "medium-warning",
      title: "Medium warning",
      status: "warning",
      severity: "medium",
    }),
    check({
      id: "passed-check",
      title: "Passed check",
      status: "pass",
      severity: "none",
    }),
    check({
      id: "unverified-check",
      title: "Unverified check",
      status: "not-checked",
      severity: "unknown",
    }),
  ].map(applyFixPlan);

  it("orders by priority and excludes passed or unverified checks", () => {
    const plan = buildFixPlan(checks);

    expect(plan.map((item) => item.checkId)).toEqual([
      "high-failure",
      "medium-warning",
      "low-warning",
    ]);
    expect(plan.every((item) => item.steps.length > 0)).toBe(true);
    expect(plan.map((item) => item.checkId)).not.toContain("passed-check");
    expect(plan.map((item) => item.checkId)).not.toContain("unverified-check");
  });

  it("can limit the top actions without inventing an overall score", () => {
    const plan = buildFixPlan(checks, 2);
    expect(plan).toHaveLength(2);
    expect(plan[0].priority).toBe("high");
    expect(plan[1].priority).toBe("medium");
    expect(plan.map((item) => item.checkId)).not.toContain("passed-check");
  });
});

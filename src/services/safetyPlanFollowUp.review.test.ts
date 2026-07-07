import { describe, it, expect, vi, beforeEach } from "vitest";

const store: Record<string, string> = {};
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));

import { markSafetyPlanReviewed, shouldPromptReview } from "./safetyPlanFollowUp";
import { parseSafetyPlan } from "./safetyPlan";
import { INITIAL_SAFETY_PLAN } from "../data";

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

describe("markSafetyPlanReviewed", () => {
  it("creates a reviewed plan with a timestamp when none exists", () => {
    expect(markSafetyPlanReviewed()).toBe(true);
    const raw = store["nilamind_safetyplan"];
    expect(raw).toBeDefined();
    const plan = parseSafetyPlan(raw);
    expect(plan.lastUpdatedAt).toBeGreaterThan(0);
    expect(plan.warningSigns).toBe(INITIAL_SAFETY_PLAN.warningSigns);
  });

  it("updates only the timestamp and preserves existing content", () => {
    const existing = { ...INITIAL_SAFETY_PLAN, warningSigns: "test warning", lastUpdatedAt: 1 };
    store["nilamind_safetyplan"] = JSON.stringify(existing);
    expect(markSafetyPlanReviewed()).toBe(true);
    const plan = parseSafetyPlan(store["nilamind_safetyplan"]);
    expect(plan.warningSigns).toBe("test warning");
    expect(plan.lastUpdatedAt).toBeGreaterThan(1);
    expect(shouldPromptReview(plan)).toBe(false);
  });

  it("recovers from corrupt stored data and still marks reviewed", () => {
    store["nilamind_safetyplan"] = "not-json";
    expect(markSafetyPlanReviewed()).toBe(true);
    const plan = parseSafetyPlan(store["nilamind_safetyplan"]);
    expect(plan.lastUpdatedAt).toBeGreaterThan(0);
  });
});

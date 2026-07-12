import { describe, it, expect } from "vitest";
import { computeCircadianFeedback } from "./circadianFeedback";
import { regularityFromStd } from "./circadian";

describe("computeCircadianFeedback", () => {
  it("returns null with insufficient sleep data", () => {
    const r = computeCircadianFeedback({ sleeps: [], rhythmVariabilityMin: null });
    expect(r).toBeNull();
  });

  it("returns null with fewer than 3 sleep entries", () => {
    const r = computeCircadianFeedback({ sleeps: [7.5, 8], rhythmVariabilityMin: null });
    expect(r).toBeNull();
  });

  it("computes fused score from sleep data only", () => {
    const r = computeCircadianFeedback({ sleeps: [7, 7.5, 8, 7, 7.5], rhythmVariabilityMin: null });
    expect(r).not.toBeNull();
    expect(r!.sleepRegularity).toBeGreaterThan(0);
    expect(r!.sleepRegularity).toBeLessThanOrEqual(100);
    expect(r!.combinedScore).toBeGreaterThan(0);
  });

  it("incorporates social rhythm when available", () => {
    const r = computeCircadianFeedback({
      sleeps: [7, 7.5, 8, 7, 7.5],
      rhythmVariabilityMin: 30, // regular
    });
    expect(r).not.toBeNull();
    expect(r!.rhythmRegularity).toBeGreaterThan(0);
    expect(r!.combinedScore).toBeGreaterThan(0);
  });

  it("penalizes irregular social rhythm", () => {
    const reg = computeCircadianFeedback({
      sleeps: [7, 7.5, 8, 7, 7.5],
      rhythmVariabilityMin: 30, // regular (< 45min)
    });
    const irreg = computeCircadianFeedback({
      sleeps: [7, 7.5, 8, 7, 7.5],
      rhythmVariabilityMin: 120, // irregular
    });
    expect(irreg!.rhythmRegularity).toBeLessThan(reg!.rhythmRegularity);
    expect(irreg!.combinedScore).toBeLessThan(reg!.combinedScore);
  });

  it("generates guidance text for irregular patterns", () => {
    const r = computeCircadianFeedback({
      sleeps: [5, 9, 6, 8, 4, 9, 5],
      rhythmVariabilityMin: 100,
    });
    expect(r).not.toBeNull();
    expect(r!.guidance.length).toBeGreaterThan(20);
    expect(r!.guidance).toMatch(/regular|anchor|wake|rhythm/i);
  });

  it("generates different guidance for stable vs irregular", () => {
    const stable = computeCircadianFeedback({
      sleeps: [7, 7.5, 7.2, 7.8, 7.3, 7.5, 7],
      rhythmVariabilityMin: 30,
    });
    const unstable = computeCircadianFeedback({
      sleeps: [5, 9, 4, 8, 6, 9, 5],
      rhythmVariabilityMin: 120,
    });
    expect(stable!.guidance).not.toBe(unstable!.guidance);
    expect(stable!.guidance).toMatch(/consistent|steady|protect/i);
    expect(unstable!.guidance).toMatch(/swing|anchor|regular|bed|wake/i);
  });

  it("flags when action is needed", () => {
    const r = computeCircadianFeedback({
      sleeps: [5, 9, 4, 8, 6, 9, 5, 4, 8, 6],
      rhythmVariabilityMin: 120,
    });
    expect(r!.needsAttention).toBe(true);
  });

  it("returns calm status for very regular patterns", () => {
    const r = computeCircadianFeedback({
      sleeps: [7, 7.2, 7.1, 7.3, 7, 7.2, 7.1],
      rhythmVariabilityMin: 20,
    });
    expect(r!.needsAttention).toBe(false);
    expect(r!.combinedScore).toBeGreaterThanOrEqual(80);
  });

  it("handles zero social rhythm data gracefully", () => {
    const r = computeCircadianFeedback({ sleeps: [7, 7.5, 8, 7, 7.5] });
    expect(r).not.toBeNull();
    expect(r!.rhythmRegularity).toBe(50); // neutral midpoint
  });
});

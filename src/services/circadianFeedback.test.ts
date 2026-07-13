import { describe, it, expect } from "vitest";
import { computeCircadianFeedback, computeSleepRegularityIndex } from "./circadianFeedback";
import { regularityFromStd } from "./circadian";
import type { SleepWindow } from "./socialRhythm";

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

// Group C (real Sleep Regularity Index, Phillips et al. 2017 Scientific Reports 7:3216): genuine per-epoch
// clock-time agreement between consecutive nights' bed/wake windows — a DIFFERENT construct from the
// duration-CV proxy above (computeCircadianFeedback), which is kept unchanged as the separate "sleep
// duration consistency" metric per the spec's explicit instruction not to fold the two back together (that
// exact conflation was the bug: someone with a rock-steady sleep DURATION but wildly shifting bed/wake
// TIMING scored perfectly on the old metric and should score poorly here).
describe("computeSleepRegularityIndex — real Phillips 2017 SRI", () => {
  const windows = (entries: Array<{ date: string; bedMin: number; wakeMin: number }>): SleepWindow[] =>
    entries.map((e) => ({ ...e, source: "rhythm" as const }));

  const dateN = (n: number) => `2026-07-${String(1 + n).padStart(2, "0")}`;

  it("returns null with fewer than 7 nights — insufficient data, not a misleading number", () => {
    const w = windows(Array.from({ length: 6 }, (_, i) => ({ date: dateN(i), bedMin: 23 * 60, wakeMin: 7 * 60 })));
    expect(computeSleepRegularityIndex(w)).toBeNull();
  });

  it("scores near 100 for perfectly regular bed/wake times over 7+ nights", () => {
    const w = windows(Array.from({ length: 7 }, (_, i) => ({ date: dateN(i), bedMin: 23 * 60, wakeMin: 7 * 60 })));
    const r = computeSleepRegularityIndex(w);
    expect(r).not.toBeNull();
    expect(r!.sri).toBeGreaterThanOrEqual(95);
    expect(r!.band).toBe("regular");
  });

  it("scores low for scattered, essentially-random bed/wake times", () => {
    const bedMins = [22 * 60, 60, 23 * 60 + 30, 20 * 60, 2 * 60 + 15, 21 * 60 + 45, 30];
    const wakeMins = [6 * 60, 9 * 60, 5 * 60 + 30, 4 * 60, 10 * 60, 5 * 60, 8 * 60];
    const w = windows(bedMins.map((bedMin, i) => ({ date: dateN(i), bedMin, wakeMin: wakeMins[i] })));
    const r = computeSleepRegularityIndex(w);
    expect(r).not.toBeNull();
    expect(r!.sri).toBeLessThan(60);
    expect(r!.band).not.toBe("regular");
  });

  it("is gap-tolerant: sums only over available consecutive-day pairs, a missing day doesn't tank the score", () => {
    const dates = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-05", "2026-07-06", "2026-07-07", "2026-07-08"];
    const w = windows(dates.map((date) => ({ date, bedMin: 23 * 60, wakeMin: 7 * 60 })));
    const r = computeSleepRegularityIndex(w);
    expect(r).not.toBeNull();
    expect(r!.sri).toBeGreaterThanOrEqual(95);
    expect(r!.pairsUsed).toBe(5); // 6 adjacent-index pairs minus the 1 broken by the 07-04 gap
  });

  // THE REGRESSION TEST — the exact bug this feature fixes: rock-steady DURATION, wildly shifting TIMING.
  it("REGRESSION: diverges from the old duration-CV metric on a rock-steady-duration-but-shifting-timing case", () => {
    const alt = Array.from({ length: 8 }, (_, i) => {
      const date = dateN(i);
      return i % 2 === 0
        ? { date, bedMin: 22 * 60, wakeMin: 5 * 60 + 30 } // 7.5h, ordinary night-sleeper pattern
        : { date, bedMin: 10 * 60, wakeMin: 17 * 60 + 30 }; // 7.5h, shifted ~12h — same duration, opposite timing
    });
    const w = windows(alt);

    // OLD metric (duration-CV only) sees eight identical 7.5h nights -> "perfectly regular". This is the bug.
    const old = computeCircadianFeedback({ sleeps: alt.map(() => 7.5), rhythmVariabilityMin: null });
    expect(old).not.toBeNull();
    expect(old!.sleepRegularity).toBe(100);

    // NEW real SRI: the same clock-time epoch is asleep on one night and awake on the next -> scores poorly.
    const real = computeSleepRegularityIndex(w);
    expect(real).not.toBeNull();
    expect(real!.sri).toBeLessThan(40);
    expect(real!.band).not.toBe("regular");

    // The divergence itself is the point of this fix — old and new must NOT agree here.
    expect(real!.sri).toBeLessThan(old!.sleepRegularity - 50);
  });
});

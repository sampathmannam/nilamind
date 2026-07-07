import { describe, it, expect, vi } from "vitest";

vi.mock("./moodHistory", () => ({
  loadMoodHistory: vi.fn(),
}));

import { loadMoodHistory } from "./moodHistory";
import { regularityFromStd, computeCircadianInsight, type CircadianInsight } from "./circadian";

function mk(sleeps: number[]) {
  return sleeps.map((s, i) => ({ date: `2026-07-${String(i + 1).padStart(2, "0")}`, sleepHours: s }));
}

describe("circadian", () => {
  it("regularityFromStd maps CV to 0–100", () => {
    expect(regularityFromStd(8, 0)).toBe(100);
    expect(regularityFromStd(8, 4)).toBe(0); // CV=0.5
    const mid = regularityFromStd(8, 2); // CV=0.25
    expect(mid).toBe(50);
  });

  it("returns null with fewer than 3 nights", () => {
    (loadMoodHistory as any).mockReturnValue(mk([7, 8]));
    expect(computeCircadianInsight()).toBeNull();
  });

  it("computes a stable, regular insight for consistent sleep", () => {
    (loadMoodHistory as any).mockReturnValue(mk([7.5, 7.8, 7.6, 7.9, 7.7]));
    const r = computeCircadianInsight() as CircadianInsight;
    expect(r.nights).toBe(5);
    expect(r.regularityScore).toBeGreaterThan(80);
    expect(r.irregular).toBe(false);
    expect(r.direction).toBe("stable");
  });

  it("flags irregular sleep as a prodrome signal", () => {
    (loadMoodHistory as any).mockReturnValue(mk([4, 9, 5, 8.5, 4.5, 9]));
    const r = computeCircadianInsight() as CircadianInsight;
    expect(r.irregular).toBe(true);
    expect(r.regularityScore).toBeLessThan(60);
  });

  it("detects worsening direction when sleep shortens", () => {
    (loadMoodHistory as any).mockReturnValue(mk([8, 8, 8, 5, 5, 4.5]));
    const r = computeCircadianInsight() as CircadianInsight;
    expect(r.direction).toBe("worsening");
  });

  it("detects improving direction when sleep lengthens", () => {
    (loadMoodHistory as any).mockReturnValue(mk([5, 5, 5, 8, 8, 8]));
    const r = computeCircadianInsight() as CircadianInsight;
    expect(r.direction).toBe("improving");
  });
});

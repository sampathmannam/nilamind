import { describe, it, expect } from "vitest";
import {
  evaluateNofOne,
  computeImprovementScore,
  type NofOneDataPoint,
  type NofOneResult,
} from "./nofOneEval";

/* ─── evaluateNofOne ─── */

describe("evaluateNofOne", () => {
  it("returns insufficient_data for fewer than 7 data points", () => {
    const data: NofOneDataPoint[] = Array.from({ length: 5 }, (_, i) => ({
      date: `2026-07-0${i + 1}`,
      mood: 5,
      energy: 3,
      sleepHours: 7,
    }));
    const result = evaluateNofOne(data);
    expect(result.status).toBe("insufficient_data");
  });

  it("returns stable when no significant change", () => {
    const data: NofOneDataPoint[] = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      mood: 5,
      energy: 3,
      sleepHours: 7,
    }));
    const result = evaluateNofOne(data);
    expect(result.status).toBe("stable");
    expect(result.improvementScore).toBeCloseTo(0, 0);
  });

  it("detects improvement when mood rises over time", () => {
    const data: NofOneDataPoint[] = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      mood: 3 + (i / 13) * 5,
      energy: 2 + (i / 13) * 3,
      sleepHours: 6 + (i / 13) * 2,
    }));
    const result = evaluateNofOne(data);
    expect(result.status).toBe("improving");
    expect(result.improvementScore).toBeGreaterThan(0);
  });

  it("detects deterioration when mood falls over time", () => {
    const data: NofOneDataPoint[] = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      mood: 8 - (i / 13) * 5,
      energy: 5 - (i / 13) * 3,
      sleepHours: 8 - (i / 13) * 3,
    }));
    const result = evaluateNofOne(data);
    expect(result.status).toBe("deteriorating");
    expect(result.improvementScore).toBeLessThan(0);
  });

  it("uses reliable change index when baseline and endpoint exist", () => {
    const baseline: NofOneDataPoint[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      mood: 3,
      energy: 2,
      sleepHours: 6,
    }));
    const endpoint: NofOneDataPoint[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-07-${String(i + 8).padStart(2, "0")}`,
      mood: 7,
      energy: 4,
      sleepHours: 8,
    }));
    const result = evaluateNofOne([...baseline, ...endpoint], baseline, endpoint);
    expect(result.status).toBe("improving");
    expect(result.reliableChange).toBeDefined();
  });
});

/* ─── computeImprovementScore ─── */

describe("computeImprovementScore", () => {
  it("returns 0 for flat data", () => {
    const data: NofOneDataPoint[] = Array.from({ length: 14 }, () => ({
      date: "2026-07-10",
      mood: 5,
      energy: 3,
      sleepHours: 7,
    }));
    expect(computeImprovementScore(data)).toBeCloseTo(0, 1);
  });

  it("returns positive for upward trend", () => {
    const data: NofOneDataPoint[] = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      mood: 3 + i * 0.5,
      energy: 2 + i * 0.3,
      sleepHours: 6 + i * 0.2,
    }));
    expect(computeImprovementScore(data)).toBeGreaterThan(0);
  });

  it("returns negative for downward trend", () => {
    const data: NofOneDataPoint[] = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      mood: 8 - i * 0.5,
      energy: 5 - i * 0.3,
      sleepHours: 8 - i * 0.2,
    }));
    expect(computeImprovementScore(data)).toBeLessThan(0);
  });
});

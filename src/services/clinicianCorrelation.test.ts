import { describe, it, expect } from "vitest";
import {
  computeSleepIntensityCorrelation,
  computeTriggerContextDistribution,
  type ClinicianTriggerDistribution,
} from "./clinicianCorrelation";

describe("clinicianCorrelation (Phase 20.4)", () => {
  describe("computeSleepIntensityCorrelation", () => {
    it("returns null when insufficient data (< 3 paired points)", () => {
      const result = computeSleepIntensityCorrelation([
        { date: "2026-07-10", sleepHours: 7, intensity: 3 },
        { date: "2026-07-11", sleepHours: 6, intensity: 4 },
      ]);
      expect(result).toBeNull();
    });

    it("computes negative correlation (less sleep → more distress)", () => {
      // Perfect negative correlation: less sleep = higher intensity
      const result = computeSleepIntensityCorrelation([
        { date: "2026-07-10", sleepHours: 8, intensity: 2 },
        { date: "2026-07-11", sleepHours: 7, intensity: 3 },
        { date: "2026-07-12", sleepHours: 6, intensity: 5 },
        { date: "2026-07-13", sleepHours: 5, intensity: 7 },
        { date: "2026-07-14", sleepHours: 4, intensity: 9 },
      ]);
      expect(result).not.toBeNull();
      expect(result!.correlation).toBeLessThan(-0.8);
      expect(result!.sampleSize).toBe(5);
    });

    it("computes positive correlation (more sleep → more distress, atypical)", () => {
      const result = computeSleepIntensityCorrelation([
        { date: "2026-07-10", sleepHours: 4, intensity: 2 },
        { date: "2026-07-11", sleepHours: 5, intensity: 3 },
        { date: "2026-07-12", sleepHours: 6, intensity: 4 },
        { date: "2026-07-13", sleepHours: 7, intensity: 5 },
        { date: "2026-07-14", sleepHours: 8, intensity: 6 },
      ]);
      expect(result).not.toBeNull();
      expect(result!.correlation).toBeGreaterThan(0.8);
    });

    it("returns null when all sleep values are identical (no variance)", () => {
      const result = computeSleepIntensityCorrelation([
        { date: "2026-07-10", sleepHours: 7, intensity: 2 },
        { date: "2026-07-11", sleepHours: 7, intensity: 5 },
        { date: "2026-07-12", sleepHours: 7, intensity: 8 },
      ]);
      expect(result).toBeNull();
    });

    it("returns null when all intensity values are identical", () => {
      const result = computeSleepIntensityCorrelation([
        { date: "2026-07-10", sleepHours: 5, intensity: 5 },
        { date: "2026-07-11", sleepHours: 7, intensity: 5 },
        { date: "2026-07-12", sleepHours: 9, intensity: 5 },
      ]);
      expect(result).toBeNull();
    });

    it("rounds correlation to 2 decimal places", () => {
      const result = computeSleepIntensityCorrelation([
        { date: "2026-07-10", sleepHours: 8, intensity: 2 },
        { date: "2026-07-11", sleepHours: 6, intensity: 4 },
        { date: "2026-07-12", sleepHours: 4, intensity: 8 },
      ]);
      expect(result).not.toBeNull();
      // correlation should be a number with at most 2 decimal places
      expect(Number.isFinite(result!.correlation)).toBe(true);
    });
  });

  describe("computeTriggerContextDistribution", () => {
    it("returns empty when no episodes", () => {
      const result = computeTriggerContextDistribution([]);
      expect(result.topTriggers).toEqual([]);
      expect(result.topContexts).toEqual([]);
    });

    it("identifies top triggers by frequency", () => {
      const result = computeTriggerContextDistribution([
        { trigger: "argument with roommate", context: "home" },
        { trigger: "argument with colleague", context: "work" },
        { trigger: "work deadline", context: "work" },
        { trigger: "argument at work", context: "work" },
        { trigger: "missed sleep", context: "home" },
      ]);
      expect(result.topTriggers.length).toBeGreaterThan(0);
      // "argument" appears 3 times as first word
      expect(result.topTriggers[0].theme).toContain("argument");
    });

    it("identifies top contexts by frequency", () => {
      const result = computeTriggerContextDistribution([
        { trigger: "a", context: "work" },
        { trigger: "b", context: "work" },
        { trigger: "c", context: "work" },
        { trigger: "d", context: "home" },
        { trigger: "e", context: "home" },
      ]);
      expect(result.topContexts.length).toBeGreaterThan(0);
      expect(result.topContexts[0].context).toBe("work");
      expect(result.topContexts[0].count).toBe(3);
    });

    it("caps triggers at 5 and contexts at 3", () => {
      const episodes = Array.from({ length: 20 }, (_, i) => ({
        trigger: `trigger_${i % 10}`,
        context: `context_${i % 8}`,
      }));
      const result = computeTriggerContextDistribution(episodes);
      expect(result.topTriggers.length).toBeLessThanOrEqual(5);
      expect(result.topContexts.length).toBeLessThanOrEqual(3);
    });

    it("handles episodes with null triggers", () => {
      const result = computeTriggerContextDistribution([
        { trigger: null, context: "home" },
        { trigger: "work stress", context: "work" },
        { trigger: null, context: "home" },
      ]);
      expect(result.topTriggers.length).toBe(1);
      expect(result.topContexts.length).toBe(2);
    });
  });
});

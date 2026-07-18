import { describe, it, expect } from "vitest";
import { computeTrends, passiveSignalContextLine, type TrendSummary } from "./trendAggregator";
import type { DailyFeatureSet } from "./signalExtractor";

function makeFeature(date: string, overrides?: Partial<DailyFeatureSet>): DailyFeatureSet {
  return {
    date,
    sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
    activity: { screenTimeMinutes: 120, screenTimeDelta7d: null, socialAppMinutes: null, unlockCount: null },
    circadian: { firstOpenTime: "07:30", lastCloseTime: "23:00", rhythmRegularityScore: null },
    typing: { avgTypingSpeed: 60, avgPauseDuration: null, burstCount: null, moodSignal: null },
    heartRate: { restingHr: null, hrVariability: null },
    composite: { activitySpike: false, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false },
    ...overrides,
  };
}

describe("trendAggregator (Phase 21)", () => {
  describe("computeTrends", () => {
    it("returns empty array for insufficient data", () => {
      expect(computeTrends([])).toEqual([]);
      expect(computeTrends([makeFeature("2026-07-18")])).toEqual([]);
    });

    it("detects declining sleep trend", () => {
      const window = [
        makeFeature("2026-07-11", { sleep: { hoursLastNight: 8, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-12", { sleep: { hoursLastNight: 7.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-13", { sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-14", { sleep: { hoursLastNight: 6.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-15", { sleep: { hoursLastNight: 6, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-16", { sleep: { hoursLastNight: 5.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-17", { sleep: { hoursLastNight: 5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-18", { sleep: { hoursLastNight: 4.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
      ];
      const trends = computeTrends(window);
      const sleepTrend = trends.find((t) => t.domain === "sleep");
      expect(sleepTrend).toBeDefined();
      expect(sleepTrend!.direction).toBe("declining");
      expect(sleepTrend!.changePercent).toBeLessThan(0);
    });

    it("detects improving sleep trend", () => {
      const window = [
        makeFeature("2026-07-11", { sleep: { hoursLastNight: 5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-12", { sleep: { hoursLastNight: 5.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-13", { sleep: { hoursLastNight: 6, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-14", { sleep: { hoursLastNight: 6.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-15", { sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-16", { sleep: { hoursLastNight: 7.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-17", { sleep: { hoursLastNight: 8, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-18", { sleep: { hoursLastNight: 8, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
      ];
      const trends = computeTrends(window);
      const sleepTrend = trends.find((t) => t.domain === "sleep");
      expect(sleepTrend).toBeDefined();
      expect(sleepTrend!.direction).toBe("improving");
    });

    it("detects stable trend when values are consistent", () => {
      const window = Array.from({ length: 8 }, (_, i) =>
        makeFeature(`2026-07-${11 + i}`, {
          sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
        })
      );
      const trends = computeTrends(window);
      const sleepTrend = trends.find((t) => t.domain === "sleep");
      expect(sleepTrend!.direction).toBe("stable");
      expect(sleepTrend!.changePercent).toBe(0);
    });

    it("returns insufficient_data when all values are null", () => {
      const window = Array.from({ length: 8 }, (_, i) =>
        makeFeature(`2026-07-${11 + i}`, {
          sleep: { hoursLastNight: null, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
        })
      );
      const trends = computeTrends(window);
      const sleepTrend = trends.find((t) => t.domain === "sleep");
      expect(sleepTrend!.direction).toBe("insufficient_data");
    });
  });

  describe("passiveSignalContextLine", () => {
    it("returns empty for no trends", () => {
      expect(passiveSignalContextLine([])).toBe("");
    });

    it("returns empty when all trends are stable", () => {
      const trends: TrendSummary[] = [
        { domain: "sleep", direction: "stable", changePercent: 0, confidence: 0.8, oneLine: "Sleep stable." },
        { domain: "activity", direction: "stable", changePercent: 0, confidence: 0.7, oneLine: "Activity stable." },
      ];
      expect(passiveSignalContextLine(trends)).toBe("");
    });

    it("generates context line for declining trends", () => {
      const trends: TrendSummary[] = [
        { domain: "sleep", direction: "declining", changePercent: -20, confidence: 0.8, oneLine: "Sleep declining." },
        { domain: "activity", direction: "stable", changePercent: 0, confidence: 0.7, oneLine: "Activity stable." },
      ];
      const line = passiveSignalContextLine(trends);
      expect(line).toContain("sleep");
      expect(line).toContain("not a diagnosis");
    });

    it("generates context line for improving trends", () => {
      const trends: TrendSummary[] = [
        { domain: "sleep", direction: "improving", changePercent: 15, confidence: 0.9, oneLine: "Sleep improving." },
      ];
      const line = passiveSignalContextLine(trends);
      expect(line).toContain("steadier");
    });

    it("generates context line for mixed trends", () => {
      const trends: TrendSummary[] = [
        { domain: "sleep", direction: "declining", changePercent: -15, confidence: 0.8, oneLine: "Sleep declining." },
        { domain: "activity", direction: "improving", changePercent: 10, confidence: 0.7, oneLine: "Activity improving." },
      ];
      const line = passiveSignalContextLine(trends);
      expect(line).toContain("sleep");
      expect(line).toContain("activity");
    });

    it("skips low-confidence trends", () => {
      const trends: TrendSummary[] = [
        { domain: "sleep", direction: "declining", changePercent: -20, confidence: 0.1, oneLine: "Sleep declining." },
      ];
      expect(passiveSignalContextLine(trends)).toBe("");
    });
  });
});

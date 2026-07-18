import { describe, it, expect } from "vitest";
import { detectCompoundSignals, type CompoundSignal } from "./compoundDetector";
import type { DailyFeatureSet } from "./signalExtractor";

function makeFeature(date: string, overrides?: Partial<DailyFeatureSet>): DailyFeatureSet {
  return {
    date,
    sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
    activity: { screenTimeMinutes: 120, screenTimeDelta7d: 0, socialAppMinutes: 30, unlockCount: 40 },
    circadian: { firstOpenTime: "07:30", lastCloseTime: "23:00", rhythmRegularityScore: 85 },
    typing: { avgTypingSpeed: 60, avgPauseDuration: 200, burstCount: 10, moodSignal: null },
    heartRate: { restingHr: 65, hrVariability: 45 },
    composite: { activitySpike: false, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false },
    ...overrides,
  };
}

describe("compoundDetector (Phase 22)", () => {
  describe("detectCompoundSignals", () => {
    it("returns empty for insufficient data", () => {
      expect(detectCompoundSignals([])).toEqual([]);
      expect(detectCompoundSignals([makeFeature("2026-07-18")])).toEqual([]);
    });

    it("detects activity prodrome when short sleep + screen spike", () => {
      const window = [
        makeFeature("2026-07-14", {
          sleep: { hoursLastNight: 5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 2, bedTimeVariabilityMin: null },
          composite: { activitySpike: true, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false },
        }),
        makeFeature("2026-07-15", {
          sleep: { hoursLastNight: 4.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 3, bedTimeVariabilityMin: null },
          composite: { activitySpike: true, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false },
        }),
        makeFeature("2026-07-16", {
          sleep: { hoursLastNight: 5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 4, bedTimeVariabilityMin: null },
          composite: { activitySpike: false, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false },
        }),
      ];
      const signals = detectCompoundSignals(window);
      const prodrome = signals.find((s) => s.id === "activity-prodrome");
      expect(prodrome).toBeDefined();
      expect(prodrome!.kind).toBe("risk");
      expect(prodrome!.suggestedAction).toBe("card");
    });

    it("does NOT fire activity prodrome when no short sleep", () => {
      const window = [
        makeFeature("2026-07-14", {
          sleep: { hoursLastNight: 7.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
          composite: { activitySpike: true, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false },
        }),
        makeFeature("2026-07-15", {
          sleep: { hoursLastNight: 8, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
          composite: { activitySpike: true, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false },
        }),
      ];
      const signals = detectCompoundSignals(window);
      expect(signals.find((s) => s.id === "activity-prodrome")).toBeUndefined();
    });

    it("detects circadian disintegration when 3+ days disrupted", () => {
      const window = [
        makeFeature("2026-07-14", { composite: { activitySpike: false, circadianDisruption: true, typingElevationSignal: false, sleepActivityConcordance: false } }),
        makeFeature("2026-07-15", { composite: { activitySpike: false, circadianDisruption: true, typingElevationSignal: false, sleepActivityConcordance: false } }),
        makeFeature("2026-07-16", { composite: { activitySpike: false, circadianDisruption: true, typingElevationSignal: false, sleepActivityConcordance: false } }),
        makeFeature("2026-07-17", { composite: { activitySpike: false, circadianDisruption: true, typingElevationSignal: false, sleepActivityConcordance: false } }),
        makeFeature("2026-07-18", { composite: { activitySpike: false, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false } }),
      ];
      const signals = detectCompoundSignals(window);
      const circadian = signals.find((s) => s.id === "circadian-disintegration");
      expect(circadian).toBeDefined();
      expect(circadian!.kind).toBe("risk");
    });

    it("detects withdrawal cascade when social + screen decline from the user's OWN baseline", () => {
      const window = [
        // Baseline: an established ~30 min/day social norm.
        makeFeature("2026-07-09", { activity: { screenTimeMinutes: 120, screenTimeDelta7d: 0, socialAppMinutes: 32, unlockCount: 40 } }),
        makeFeature("2026-07-10", { activity: { screenTimeMinutes: 115, screenTimeDelta7d: 0, socialAppMinutes: 28, unlockCount: 38 } }),
        makeFeature("2026-07-11", { activity: { screenTimeMinutes: 125, screenTimeDelta7d: 0, socialAppMinutes: 34, unlockCount: 42 } }),
        makeFeature("2026-07-12", { activity: { screenTimeMinutes: 118, screenTimeDelta7d: 0, socialAppMinutes: 30, unlockCount: 39 } }),
        makeFeature("2026-07-13", { activity: { screenTimeMinutes: 122, screenTimeDelta7d: 0, socialAppMinutes: 31, unlockCount: 41 } }),
        // Recent: a real drop to well below half the baseline, with screen time also declining.
        makeFeature("2026-07-14", { activity: { screenTimeMinutes: 60, screenTimeDelta7d: -40, socialAppMinutes: 10, unlockCount: 20 } }),
        makeFeature("2026-07-15", { activity: { screenTimeMinutes: 50, screenTimeDelta7d: -50, socialAppMinutes: 8, unlockCount: 15 } }),
        makeFeature("2026-07-16", { activity: { screenTimeMinutes: 70, screenTimeDelta7d: -35, socialAppMinutes: 12, unlockCount: 25 } }),
        makeFeature("2026-07-17", { activity: { screenTimeMinutes: 45, screenTimeDelta7d: -45, socialAppMinutes: 5, unlockCount: 10 } }),
        makeFeature("2026-07-18", { activity: { screenTimeMinutes: 55, screenTimeDelta7d: -30, socialAppMinutes: 10, unlockCount: 18 } }),
      ];
      const signals = detectCompoundSignals(window);
      const withdrawal = signals.find((s) => s.id === "withdrawal-cascade");
      expect(withdrawal).toBeDefined();
      expect(withdrawal!.kind).toBe("risk");
    });

    it("does NOT flag withdrawal for a user who simply never uses social apps (no baseline to decline from)", () => {
      // Consistently low social minutes AND a screen-time decline — the old absolute `social < 15` rule
      // fired here; the decline-from-baseline rule correctly stays silent.
      const window = Array.from({ length: 10 }, (_, i) =>
        makeFeature(`2026-07-${String(9 + i).padStart(2, "0")}`, {
          activity: { screenTimeMinutes: 50, screenTimeDelta7d: i >= 5 ? -40 : 0, socialAppMinutes: 4, unlockCount: 12 },
        }),
      );
      const signals = detectCompoundSignals(window);
      expect(signals.find((s) => s.id === "withdrawal-cascade")).toBeUndefined();
    });

    it("detects typing-motor concordance when elevation signal present", () => {
      const window = [
        makeFeature("2026-07-16", { composite: { activitySpike: false, circadianDisruption: false, typingElevationSignal: true, sleepActivityConcordance: false } }),
        makeFeature("2026-07-17", { composite: { activitySpike: false, circadianDisruption: false, typingElevationSignal: true, sleepActivityConcordance: false } }),
        makeFeature("2026-07-18", { composite: { activitySpike: false, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false } }),
      ];
      const signals = detectCompoundSignals(window);
      const typing = signals.find((s) => s.id === "typing-motor-concordance");
      expect(typing).toBeDefined();
      expect(typing!.kind).toBe("risk");
    });

    it("detects resilience cluster when all signals stable", () => {
      const window = Array.from({ length: 7 }, (_, i) =>
        makeFeature(`2026-07-${12 + i}`, {
          sleep: { hoursLastNight: 7.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
          activity: { screenTimeMinutes: 120, screenTimeDelta7d: 5, socialAppMinutes: 30, unlockCount: 40 },
          composite: { activitySpike: false, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false },
        })
      );
      const signals = detectCompoundSignals(window);
      const resilience = signals.find((s) => s.id === "resilience-cluster");
      expect(resilience).toBeDefined();
      expect(resilience!.kind).toBe("protective");
      expect(resilience!.suggestedAction).toBe("card");
    });

    it("does NOT fire resilience when there are elevation signals", () => {
      const window = Array.from({ length: 7 }, (_, i) =>
        makeFeature(`2026-07-${12 + i}`, {
          sleep: { hoursLastNight: 7.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
          activity: { screenTimeMinutes: 120, screenTimeDelta7d: 5, socialAppMinutes: 30, unlockCount: 40 },
          composite: { activitySpike: false, circadianDisruption: false, typingElevationSignal: true, sleepActivityConcordance: false },
        })
      );
      const signals = detectCompoundSignals(window);
      expect(signals.find((s) => s.id === "resilience-cluster")).toBeUndefined();
    });
  });
});

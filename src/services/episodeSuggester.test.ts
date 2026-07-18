import { describe, it, expect } from "vitest";
import { detectPhaseShift, type PhaseShiftSuggestion } from "./episodeSuggester";
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

describe("episodeSuggester (Phase 22)", () => {
  describe("detectPhaseShift", () => {
    it("returns null for insufficient data", () => {
      expect(detectPhaseShift([])).toBeNull();
      expect(detectPhaseShift([makeFeature("2026-07-18")])).toBeNull();
      expect(detectPhaseShift([makeFeature("2026-07-17"), makeFeature("2026-07-18")])).toBeNull();
    });

    it("detects possible elevation when short sleep + screen spike", () => {
      const window = [
        makeFeature("2026-07-12", { sleep: { hoursLastNight: 5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 1, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-13", { sleep: { hoursLastNight: 4.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 2, bedTimeVariabilityMin: null }, composite: { activitySpike: true, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false } }),
        makeFeature("2026-07-14", { sleep: { hoursLastNight: 4, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 3, bedTimeVariabilityMin: null }, composite: { activitySpike: true, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false } }),
        makeFeature("2026-07-15", { sleep: { hoursLastNight: 5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 4, bedTimeVariabilityMin: null }, composite: { activitySpike: true, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false } }),
        makeFeature("2026-07-16", { sleep: { hoursLastNight: 5.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 5, bedTimeVariabilityMin: null } }),
      ];
      const result = detectPhaseShift(window);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe("possible_elevation");
      expect(result!.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result!.suggestedCard.title).toContain("pattern");
    });

    it("uses wellness framing, never diagnostic language", () => {
      const window = [
        makeFeature("2026-07-12", { sleep: { hoursLastNight: 5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 1, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-13", { sleep: { hoursLastNight: 4.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 2, bedTimeVariabilityMin: null }, composite: { activitySpike: true, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false } }),
        makeFeature("2026-07-14", { sleep: { hoursLastNight: 4, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 3, bedTimeVariabilityMin: null }, composite: { activitySpike: true, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false } }),
        makeFeature("2026-07-15", { sleep: { hoursLastNight: 5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 4, bedTimeVariabilityMin: null }, composite: { activitySpike: true, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false } }),
        makeFeature("2026-07-16", { sleep: { hoursLastNight: 5.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 5, bedTimeVariabilityMin: null } }),
      ];
      const result = detectPhaseShift(window);
      expect(result).not.toBeNull();
      // Must NOT contain diagnostic language
      const allText = `${result!.suggestedCard.title} ${result!.suggestedCard.body}`.toLowerCase();
      expect(allText).not.toContain("episode");
      expect(allText).not.toContain("mania");
      expect(allText).not.toContain("depression");
      expect(allText).not.toContain("diagnosis");
      expect(allText).not.toContain("disorder");
    });

    it("detects possible depression when sleep increasing + activity declining", () => {
      const window = [
        makeFeature("2026-07-12", { sleep: { hoursLastNight: 6, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null }, activity: { screenTimeMinutes: 150, screenTimeDelta7d: 10, socialAppMinutes: 30, unlockCount: 40 } }),
        makeFeature("2026-07-13", { sleep: { hoursLastNight: 6.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null }, activity: { screenTimeMinutes: 140, screenTimeDelta7d: -5, socialAppMinutes: 25, unlockCount: 35 } }),
        makeFeature("2026-07-14", { sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null }, activity: { screenTimeMinutes: 130, screenTimeDelta7d: -10, socialAppMinutes: 20, unlockCount: 30 } }),
        makeFeature("2026-07-15", { sleep: { hoursLastNight: 8, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null }, activity: { screenTimeMinutes: 100, screenTimeDelta7d: -30, socialAppMinutes: 15, unlockCount: 25 } }),
        makeFeature("2026-07-16", { sleep: { hoursLastNight: 9, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null }, activity: { screenTimeMinutes: 80, screenTimeDelta7d: -40, socialAppMinutes: 10, unlockCount: 20 } }),
      ];
      const result = detectPhaseShift(window);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe("possible_depression");
    });

    it("detects possible improvement when sleep improving + stable typing", () => {
      const window = [
        makeFeature("2026-07-12", { sleep: { hoursLastNight: 9, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-13", { sleep: { hoursLastNight: 8.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-14", { sleep: { hoursLastNight: 8, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-15", { sleep: { hoursLastNight: 7.5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
        makeFeature("2026-07-16", { sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null } }),
      ];
      const result = detectPhaseShift(window);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe("possible_improvement");
    });

    it("returns null when signals are insufficient for any pattern", () => {
      const window = Array.from({ length: 7 }, (_, i) =>
        makeFeature(`2026-07-${10 + i}`, {
          sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
          activity: { screenTimeMinutes: 120, screenTimeDelta7d: 0, socialAppMinutes: 30, unlockCount: 40 },
          composite: { activitySpike: false, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false },
        })
      );
      expect(detectPhaseShift(window)).toBeNull();
    });
  });
});

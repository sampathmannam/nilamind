import { describe, it, expect, beforeEach } from "vitest";
import {
  upsertDailyFeature,
  getDailyFeature,
  getFeatureWindow,
  recordProactiveCardEvent,
  isCardTypeInCooldown,
  pruneOldFeatures,
  clearPassiveSensingData,
  getPassiveSensingStatus,
  updatePassiveSensingStatus,
} from "./signalStore";
import type { DailyFeatureSet } from "./signalExtractor";
import { secureLocal } from "./secureLocal";

const MOCK_FEATURE: DailyFeatureSet = {
  date: "2026-07-18",
  sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: 0.15, shortSleepRun: 0, bedTimeVariabilityMin: null },
  activity: { screenTimeMinutes: 120, screenTimeDelta7d: 0, socialAppMinutes: 30, unlockCount: 40 },
  circadian: { firstOpenTime: "07:30", lastCloseTime: "23:00", rhythmRegularityScore: 85 },
  typing: { avgTypingSpeed: 60, avgPauseDuration: 200, burstCount: 10, moodSignal: null },
  heartRate: { restingHr: 65, hrVariability: 45 },
  composite: { activitySpike: false, circadianDisruption: false, typingElevationSignal: false, sleepActivityConcordance: false },
};

function makeFeature(date: string, overrides?: Partial<DailyFeatureSet>): DailyFeatureSet {
  return { ...MOCK_FEATURE, date, ...overrides };
}

describe("signalStore (Phase 21)", () => {
  beforeEach(() => {
    clearPassiveSensingData();
  });

  describe("upsertDailyFeature", () => {
    it("stores and retrieves a feature set", () => {
      upsertDailyFeature(MOCK_FEATURE);
      const stored = getDailyFeature("2026-07-18");
      expect(stored).not.toBeNull();
      expect(stored!.date).toBe("2026-07-18");
      expect(stored!.sleep.hoursLastNight).toBe(7);
    });

    it("overwrites existing feature for same date", () => {
      upsertDailyFeature(MOCK_FEATURE);
      const updated = makeFeature("2026-07-18", { sleep: { ...MOCK_FEATURE.sleep, hoursLastNight: 5 } });
      upsertDailyFeature(updated);
      const stored = getDailyFeature("2026-07-18");
      expect(stored!.sleep.hoursLastNight).toBe(5);
    });

    it("maintains oldest-first ordering", () => {
      upsertDailyFeature(makeFeature("2026-07-18"));
      upsertDailyFeature(makeFeature("2026-07-16"));
      upsertDailyFeature(makeFeature("2026-07-17"));
      const window = getFeatureWindow(3);
      expect(window[0].date).toBe("2026-07-16");
      expect(window[1].date).toBe("2026-07-17");
      expect(window[2].date).toBe("2026-07-18");
    });
  });

  describe("90-day cap", () => {
    it("prunes oldest entries when exceeding 90 days", () => {
      // Insert 91 features
      for (let i = 0; i < 91; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        upsertDailyFeature(makeFeature(d.toISOString().split("T")[0]));
      }
      const window = getFeatureWindow(100);
      expect(window.length).toBe(90);
    });
  });

  describe("pruneOldFeatures", () => {
    it("removes features older than 90 days", () => {
      // Insert old feature
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      upsertDailyFeature(makeFeature(oldDate.toISOString().split("T")[0]));
      // Insert recent feature
      upsertDailyFeature(makeFeature("2026-07-18"));
      pruneOldFeatures();
      expect(getDailyFeature(oldDate.toISOString().split("T")[0])).toBeNull();
      expect(getDailyFeature("2026-07-18")).not.toBeNull();
    });
  });

  describe("proactive card records", () => {
    it("records and checks card events", () => {
      recordProactiveCardEvent({
        id: "card-1",
        type: "sleep_pattern",
        shownAt: new Date().toISOString(),
        dismissed: false,
        clicked: false,
      });
      // Card type is in cooldown (0 hours = just shown)
      expect(isCardTypeInCooldown("sleep_pattern", 1)).toBe(true);
      // Different type not in cooldown
      expect(isCardTypeInCooldown("activity_shift", 1)).toBe(false);
    });

    it("returns false when no matching record exists", () => {
      expect(isCardTypeInCooldown("sleep_pattern", 24)).toBe(false);
    });
  });

  describe("passive sensing status", () => {
    it("stores and retrieves status", () => {
      updatePassiveSensingStatus({
        lastExtractionDate: "2026-07-18",
        lastExtractionAt: Date.now(),
        sourcesActive: ["phoneBehaviour", "autoAnchors"],
        totalExtractions: 5,
      });
      const status = getPassiveSensingStatus();
      expect(status).not.toBeNull();
      expect(status!.lastExtractionDate).toBe("2026-07-18");
      expect(status!.sourcesActive).toContain("phoneBehaviour");
      expect(status!.totalExtractions).toBe(5);
    });

    it("returns null when no status exists", () => {
      expect(getPassiveSensingStatus()).toBeNull();
    });
  });

  describe("clearPassiveSensingData", () => {
    it("removes all passive sensing data", () => {
      upsertDailyFeature(MOCK_FEATURE);
      recordProactiveCardEvent({
        id: "card-1", type: "test", shownAt: new Date().toISOString(),
        dismissed: false, clicked: false,
      });
      updatePassiveSensingStatus({
        lastExtractionDate: "2026-07-18", lastExtractionAt: Date.now(),
        sourcesActive: [], totalExtractions: 1,
      });
      clearPassiveSensingData();
      expect(getDailyFeature("2026-07-18")).toBeNull();
      expect(getPassiveSensingStatus()).toBeNull();
    });
  });
});

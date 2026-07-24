import { describe, it, expect, beforeEach } from "vitest";
import { localDateKey } from "./storageUtils";
import {
  extractAllFeatures,
  extractTodayFeatures,
  extractFeatureWindow,
  computeComposites,
  type DailyFeatureSet,
} from "./signalExtractor";
import { secureLocal } from "./secureLocal";

describe("signalExtractor (Phase 21)", () => {
  beforeEach(() => {
    // Clear all relevant keys
    secureLocal.removeItem("nilamind_mood_history");
    secureLocal.removeItem("nilamind_phone_behaviour");
    secureLocal.removeItem("nilamind_auto_anchors");
    secureLocal.removeItem("nilamind_social_rhythm");
    secureLocal.removeItem("nilamind_typing_patterns");
    secureLocal.removeItem("nilamind_heart_rate");
  });

  describe("extractAllFeatures", () => {
    it("returns empty feature set when no stores have data", () => {
      const today = new Date().toISOString().split("T")[0];
      const features = extractAllFeatures(today);
      expect(features.date).toBe(today);
      expect(features.sleep.hoursLastNight).toBeNull();
      expect(features.sleep.shortSleepRun).toBe(0);
      expect(features.activity.screenTimeMinutes).toBeNull();
      expect(features.circadian.firstOpenTime).toBeNull();
      expect(features.typing.moodSignal).toBeNull();
      expect(features.heartRate.restingHr).toBeNull();
    });

    it("reads sleep hours from mood history", () => {
      const today = new Date().toISOString().split("T")[0];
      const history = [
        { date: today, sleepHours: 6.5, emotion: "tired", intensity: 5 },
        { date: "2026-01-01", sleepHours: 8, emotion: "good", intensity: 3 },
      ];
      secureLocal.setItem("nilamind_mood_history", JSON.stringify(history));
      const features = extractAllFeatures(today);
      expect(features.sleep.hoursLastNight).toBe(6.5);
    });

    it("reads activity from phone behaviour snapshots", () => {
      const today = new Date().toISOString().split("T")[0];
      const snaps = [
        { date: today, screenTimeMinutes: 180, unlockCount: 45, socialAppMinutes: 30 },
        { date: "2026-01-01", screenTimeMinutes: 120, unlockCount: 30, socialAppMinutes: 20 },
      ];
      secureLocal.setItem("nilamind_phone_behaviour", JSON.stringify(snaps));
      const features = extractAllFeatures(today);
      expect(features.activity.screenTimeMinutes).toBe(180);
      expect(features.activity.unlockCount).toBe(45);
      expect(features.activity.socialAppMinutes).toBe(30);
    });

    it("reads circadian anchors from auto anchors", () => {
      const today = new Date().toISOString().split("T")[0];
      const anchors: Record<string, { firstOpen: string; lastClose: string }> = {};
      anchors[today] = { firstOpen: "07:30", lastClose: "23:15" };
      secureLocal.setItem("nilamind_auto_anchors", JSON.stringify(anchors));
      const features = extractAllFeatures(today);
      expect(features.circadian.firstOpenTime).toBe("07:30");
      expect(features.circadian.lastCloseTime).toBe("23:15");
    });

    it("reads typing patterns", () => {
      const typing = { avgTypingSpeed: 65, avgPauseDuration: 200, burstCount: 12, moodSignal: "mania" as const };
      secureLocal.setItem("nilamind_typing_patterns", JSON.stringify(typing));
      const features = extractAllFeatures(new Date().toISOString().split("T")[0]);
      expect(features.typing.avgTypingSpeed).toBe(65);
      expect(features.typing.moodSignal).toBe("mania");
    });

    it("computes short sleep run from consecutive short nights", () => {
      const today = new Date().toISOString().split("T")[0];
      const history = [
        { date: today, sleepHours: 5, emotion: "tired", intensity: 6 },
        { date: getNDaysAgo(1), sleepHours: 4.5, emotion: "exhausted", intensity: 7 },
        { date: getNDaysAgo(2), sleepHours: 5.5, emotion: "wired", intensity: 5 },
        { date: getNDaysAgo(3), sleepHours: 7, emotion: "okay", intensity: 4 },
      ];
      secureLocal.setItem("nilamind_mood_history", JSON.stringify(history));
      const features = extractAllFeatures(today);
      expect(features.sleep.shortSleepRun).toBe(3);
    });

    it("returns 0 short sleep run when no consecutive short nights", () => {
      const today = new Date().toISOString().split("T")[0];
      const history = [
        { date: today, sleepHours: 7.5, emotion: "good", intensity: 3 },
        { date: getNDaysAgo(1), sleepHours: 8, emotion: "good", intensity: 2 },
      ];
      secureLocal.setItem("nilamind_mood_history", JSON.stringify(history));
      const features = extractAllFeatures(today);
      expect(features.sleep.shortSleepRun).toBe(0);
    });
  });

  describe("computeComposites", () => {
    it("detects activity spike only when screen time exceeds 150% of the 7-day baseline", () => {
      // baseline avg = 200 − 80 = 120; 200 > 1.5 × 120 (180) → spike.
      const spike = computeComposites({
        sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
        activity: { screenTimeMinutes: 200, screenTimeDelta7d: 80, socialAppMinutes: null, unlockCount: null },
        circadian: { firstOpenTime: "07:30", lastCloseTime: "23:00", rhythmRegularityScore: null },
        typing: { avgTypingSpeed: null, avgPauseDuration: null, burstCount: null, moodSignal: null },
        heartRate: { restingHr: null, hrVariability: null },
      });
      expect(spike.activitySpike).toBe(true);

      // baseline avg = 180 − 60 = 120; 180 is NOT > 180 → a merely-above-average day is not a spike.
      const mild = computeComposites({
        sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
        activity: { screenTimeMinutes: 180, screenTimeDelta7d: 60, socialAppMinutes: null, unlockCount: null },
        circadian: { firstOpenTime: "07:30", lastCloseTime: "23:00", rhythmRegularityScore: null },
        typing: { avgTypingSpeed: null, avgPauseDuration: null, burstCount: null, moodSignal: null },
        heartRate: { restingHr: null, hrVariability: null },
      });
      expect(mild.activitySpike).toBe(false);
    });

    it("does not flag activity spike when no delta", () => {
      const features = {
        sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
        activity: { screenTimeMinutes: 120, screenTimeDelta7d: null, socialAppMinutes: null, unlockCount: null },
        circadian: { firstOpenTime: "07:30", lastCloseTime: "23:00", rhythmRegularityScore: null },
        typing: { avgTypingSpeed: null, avgPauseDuration: null, burstCount: null, moodSignal: null },
        heartRate: { restingHr: null, hrVariability: null },
      };
      const composites = computeComposites(features);
      expect(composites.activitySpike).toBe(false);
    });

    it("detects typing elevation signal", () => {
      const features = {
        sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
        activity: { screenTimeMinutes: 120, screenTimeDelta7d: null, socialAppMinutes: null, unlockCount: null },
        circadian: { firstOpenTime: "07:30", lastCloseTime: "23:00", rhythmRegularityScore: null },
        typing: { avgTypingSpeed: null, avgPauseDuration: null, burstCount: null, moodSignal: "mania" as const },
        heartRate: { restingHr: null, hrVariability: null },
      };
      const composites = computeComposites(features);
      expect(composites.typingElevationSignal).toBe(true);
    });

    it("detects sleep-activity concordance", () => {
      const features = {
        sleep: { hoursLastNight: 5, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 3, bedTimeVariabilityMin: null },
        activity: { screenTimeMinutes: 200, screenTimeDelta7d: 80, socialAppMinutes: null, unlockCount: null },
        circadian: { firstOpenTime: "07:30", lastCloseTime: "23:00", rhythmRegularityScore: null },
        typing: { avgTypingSpeed: null, avgPauseDuration: null, burstCount: null, moodSignal: null },
        heartRate: { restingHr: null, hrVariability: null },
      };
      const composites = computeComposites(features);
      expect(composites.sleepActivityConcordance).toBe(true);
    });

    it("does NOT flag circadian disruption when anchors are missing (insufficient data, not disruption)", () => {
      // The old rule flagged any missing anchor as disruption, so a user with no anchor data read as
      // disrupted every day → spurious "Routine disruption" + forced `elevated` state for everyone.
      const features = {
        sleep: { hoursLastNight: 7, sleepRegularityIndex: null, sleepCv: null, shortSleepRun: 0, bedTimeVariabilityMin: null },
        activity: { screenTimeMinutes: 120, screenTimeDelta7d: null, socialAppMinutes: null, unlockCount: null },
        circadian: { firstOpenTime: null, lastCloseTime: null, rhythmRegularityScore: null },
        typing: { avgTypingSpeed: null, avgPauseDuration: null, burstCount: null, moodSignal: null },
        heartRate: { restingHr: null, hrVariability: null },
      };
      const composites = computeComposites(features);
      expect(composites.circadianDisruption).toBe(false);
    });
  });

  describe("circadian disruption via extractAllFeatures", () => {
    it("detects disruption when both anchors deviate ≥ 90 min from 7-day median", () => {
      const today = localDateKey();
      const anchors: Record<string, { firstOpen: string; lastClose: string }> = {};
      // 6 days of stable baseline: first open 07:30, last close 23:00
      for (let i = 1; i <= 6; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        anchors[localDateKey(d)] = { firstOpen: "07:30", lastClose: "23:00" };
      }
      // Today: first open shifted to 04:45 (−165 min from median), last close shifted to 19:30 (−210 min)
      anchors[today] = { firstOpen: "04:45", lastClose: "19:30" };
      secureLocal.setItem("nilamind_auto_anchors", JSON.stringify(anchors));

      const features = extractAllFeatures(today);
      expect(features.composite.circadianDisruption).toBe(true);
    });

    it("does NOT flag disruption when only one anchor deviates", () => {
      const today = localDateKey();
      const anchors: Record<string, { firstOpen: string; lastClose: string }> = {};
      for (let i = 1; i <= 6; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        anchors[localDateKey(d)] = { firstOpen: "07:30", lastClose: "23:00" };
      }
      // Only first open deviates; last close is normal
      anchors[today] = { firstOpen: "04:45", lastClose: "23:00" };
      secureLocal.setItem("nilamind_auto_anchors", JSON.stringify(anchors));

      const features = extractAllFeatures(today);
      expect(features.composite.circadianDisruption).toBe(false);
    });

    it("does NOT flag disruption with fewer than 4 days of data", () => {
      const today = localDateKey();
      const anchors: Record<string, { firstOpen: string; lastClose: string }> = {};
      // Only 2 prior days — not enough for a meaningful median
      for (let i = 1; i <= 2; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        anchors[localDateKey(d)] = { firstOpen: "07:30", lastClose: "23:00" };
      }
      anchors[today] = { firstOpen: "04:45", lastClose: "19:30" };
      secureLocal.setItem("nilamind_auto_anchors", JSON.stringify(anchors));

      const features = extractAllFeatures(today);
      expect(features.composite.circadianDisruption).toBe(false);
    });

    it("does NOT flag disruption when today's anchors are missing", () => {
      const anchors: Record<string, { firstOpen: string; lastClose: string }> = {};
      for (let i = 1; i <= 6; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        anchors[localDateKey(d)] = { firstOpen: "07:30", lastClose: "23:00" };
      }
      // No entry for today
      secureLocal.setItem("nilamind_auto_anchors", JSON.stringify(anchors));

      const features = extractAllFeatures(localDateKey());
      expect(features.composite.circadianDisruption).toBe(false);
    });

    it("does NOT flag disruption with a minor shift (both < 90 min)", () => {
      const today = localDateKey();
      const anchors: Record<string, { firstOpen: string; lastClose: string }> = {};
      for (let i = 1; i <= 6; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        anchors[localDateKey(d)] = { firstOpen: "07:30", lastClose: "23:00" };
      }
      // Small shift: 07:50 (+20 min) and 23:15 (+15 min) — both under 90 min threshold
      anchors[today] = { firstOpen: "07:50", lastClose: "23:15" };
      secureLocal.setItem("nilamind_auto_anchors", JSON.stringify(anchors));

      const features = extractAllFeatures(today);
      expect(features.composite.circadianDisruption).toBe(false);
    });
  });

  describe("extractFeatureWindow", () => {
    it("returns oldest-first array of features", () => {
      const today = new Date().toISOString().split("T")[0];
      const window = extractFeatureWindow(today, 3);
      expect(window.length).toBe(3);
      expect(window[0].date < window[1].date).toBe(true);
      expect(window[1].date < window[2].date).toBe(true);
    });

    it("returns requested number of days", () => {
      const today = new Date().toISOString().split("T")[0];
      const window = extractFeatureWindow(today, 7);
      expect(window.length).toBe(7);
    });
  });

  describe("extractTodayFeatures", () => {
    it("returns features for today's date", () => {
      const features = extractTodayFeatures();
      // Must match the code's basis: extractTodayFeatures keys on localDateKey() (local calendar day),
      // NOT UTC toISOString — they diverge in the evening in +offset zones (e.g. IST), which used to flake.
      const today = localDateKey();
      expect(features.date).toBe(today);
    });
  });
});

function getNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

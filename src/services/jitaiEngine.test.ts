import { describe, it, expect } from "vitest";
import { assessJitai } from "./jitaiEngine";
import type { UsageSummary } from "./usageAnalytics";

function mockMoods(intensities: number[]) {
  return intensities.map((intensity, i) => {
    const d = new Date();
    d.setDate(d.getDate() - intensities.length + i + 1);
    return {
      date: d.toISOString().split("T")[0],
      mood: "anxious",
      intensity,
      sleepHours: 7,
      socialInteraction: 5,
    };
  });
}

const emptyUsage: UsageSummary = {
  totalCheckins: 0,
  checkinFrequency: 0,
  avgMood: null,
  topEmotion: null,
  moodSleepCorrelation: null,
  sleepTrend: null,
  features: [],
  protocols: { started: 0, completed: 0, rate: 0 },
  assessments: {},
};

const fullUsage: UsageSummary = {
  totalCheckins: 50,
  checkinFrequency: 0.5,
  avgMood: 4.2,
  topEmotion: "anxious",
  moodSleepCorrelation: null,
  sleepTrend: null,
  features: ["values_snapshot", "diary_cards", "episode_records", "thought_records"],
  protocols: { started: 3, completed: 2, rate: 0.67 },
  assessments: { "PHQ-9": 12 },
};

describe("assessJitai", () => {
  it("returns no nudge when everything is fine", () => {
    const r = assessJitai({
      sleep: { firing: false, nightsBelow: 0, baselineHours: 7.5, detail: "" },
      moodHistory: mockMoods([3, 4, 4, 3, 2, 3, 4]),
      daysSinceLastCheckin: 0,
      usageAnalytics: emptyUsage,
    });
    expect(r.shouldNudge).toBe(false);
    expect(r.triggers).toEqual([]);
  });

  it("detects sleep prodrome", () => {
    const r = assessJitai({
      sleep: { firing: true, nightsBelow: 3, baselineHours: 7.5, detail: "" },
      moodHistory: mockMoods([3, 4, 4, 3, 3]),
      daysSinceLastCheckin: 0,
      usageAnalytics: emptyUsage,
    });
    expect(r.shouldNudge).toBe(true);
    expect(r.triggers).toContain("sleep_prodrome");
    expect(r.nudgeText).toContain("sleep");
  });

  it("detects mood deterioration", () => {
    const r = assessJitai({
      sleep: null,
      moodHistory: mockMoods([3, 3, 4, 3, 2, 5, 7, 8, 8, 9]),
      daysSinceLastCheckin: 0,
      usageAnalytics: emptyUsage,
    });
    expect(r.triggers).toContain("mood_deterioration");
  });

  it("detects inactivity (>3 days since last checkin)", () => {
    const r = assessJitai({
      sleep: null,
      moodHistory: [],
      daysSinceLastCheckin: 4,
      usageAnalytics: emptyUsage,
    });
    expect(r.triggers).toContain("inactivity");
  });

  it("detects elevation risk from user text", () => {
    const r = assessJitai({
      sleep: null,
      moodHistory: mockMoods([3, 3, 4, 4]),
      lastUserText: "I stopped taking my meds and I feel amazing",
      daysSinceLastCheckin: 0,
      usageAnalytics: emptyUsage,
    });
    expect(r.triggers).toContain("elevation_risk");
    expect(r.severity).toBe("urgent");
  });

  it("prioritizes urgent over noticeable", () => {
    const r = assessJitai({
      sleep: { firing: true, nightsBelow: 3, baselineHours: 7.5, detail: "" },
      moodHistory: mockMoods([3, 3, 4, 4, 5]),
      lastUserText: "I'm invincible and don't need my meds",
      daysSinceLastCheckin: 0,
      usageAnalytics: emptyUsage,
    });
    expect(r.severity).toBe("urgent");
  });

  it("handles empty input gracefully", () => {
    const r = assessJitai({
      sleep: null,
      moodHistory: [],
      daysSinceLastCheckin: 0,
      usageAnalytics: emptyUsage,
    });
    expect(r.shouldNudge).toBe(false);
  });

  describe("personalization", () => {
    it("includes protocol recommendation when emotion dysregulation detected", () => {
      const r = assessJitai({
        sleep: null,
        moodHistory: mockMoods([3, 3, 4, 3, 2, 6, 8, 8, 9, 10]),
        lastUserText: "I can't handle these intense emotions",
        daysSinceLastCheckin: 1,
        usageAnalytics: { ...emptyUsage, totalCheckins: 10, features: ["thought_records"] },
      });
      expect(r.protocolRecommendation).toBe("dbt-skills-training");
    });

    it("includes protocol recommendation for stuck patterns", () => {
      const r = assessJitai({
        sleep: null,
        moodHistory: mockMoods([3, 3, 4, 4, 5]),
        lastUserText: "I keep having the same stuck thoughts over and over",
        daysSinceLastCheckin: 3,
        usageAnalytics: { ...emptyUsage, totalCheckins: 10, features: [] },
      });
      expect(r.protocolRecommendation).toBe("act-training");
    });

    it("personalizes checkin nudge for frequent users", () => {
      const r = assessJitai({
        sleep: null,
        moodHistory: mockMoods([5, 5, 6, 6, 7]),
        lastUserText: "I can't cope",
        daysSinceLastCheckin: 3,
        usageAnalytics: { ...emptyUsage, totalCheckins: 150, checkinFrequency: 0.9, features: [] },
      });
      expect(r.triggers).toContain("inactivity");
      expect(r.nudgeText).toMatch(/check-in|mood|trend/i);
    });

    it("mentions values when usersnapshot exists", () => {
      const r = assessJitai({
        sleep: null,
        moodHistory: mockMoods([4, 4, 5, 5, 6, 6]),
        lastUserText: "I feel lost",
        daysSinceLastCheckin: 5,
        usageAnalytics: { ...fullUsage, features: ["values_snapshot"] },
      });
      expect(r.triggers).toContain("inactivity");
      expect(r.nudgeText.toLowerCase()).toMatch(/values|compass|matter/i);
    });

    it("works without usage analytics", () => {
      const r = assessJitai({
        sleep: { firing: true, nightsBelow: 2, baselineHours: 7.5, detail: "" },
        moodHistory: mockMoods([3, 4, 4, 3, 3]),
        daysSinceLastCheckin: 0,
      });
      expect(r.triggers).toContain("sleep_prodrome");
      expect(r.protocolRecommendation).toBeNull();
    });
  });
});

import { describe, it, expect } from "vitest";
import { assessJitai } from "./jitaiEngine";

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

describe("assessJitai", () => {
  it("returns no nudge when everything is fine", () => {
    const r = assessJitai({
      sleep: { firing: false, nightsBelow: 0, baselineHours: 7.5, detail: "" },
      moodHistory: mockMoods([3, 4, 4, 3, 2, 3, 4]),
      daysSinceLastCheckin: 0,
    });
    expect(r.shouldNudge).toBe(false);
    expect(r.triggers).toEqual([]);
  });

  it("detects sleep prodrome", () => {
    const r = assessJitai({
      sleep: { firing: true, nightsBelow: 3, baselineHours: 7.5, detail: "" },
      moodHistory: mockMoods([3, 4, 4, 3, 3]),
      daysSinceLastCheckin: 0,
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
    });
    expect(r.triggers).toContain("mood_deterioration");
  });

  it("detects inactivity (>3 days since last checkin)", () => {
    const r = assessJitai({
      sleep: null,
      moodHistory: [],
      daysSinceLastCheckin: 4,
    });
    expect(r.triggers).toContain("inactivity");
  });

  it("detects elevation risk from user text", () => {
    const r = assessJitai({
      sleep: null,
      moodHistory: mockMoods([3, 3, 4, 4]),
      lastUserText: "I stopped taking my meds and I feel amazing",
      daysSinceLastCheckin: 0,
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
    });
    expect(r.severity).toBe("urgent");
  });

  it("handles empty input gracefully", () => {
    const r = assessJitai({
      sleep: null,
      moodHistory: [],
      daysSinceLastCheckin: 0,
    });
    expect(r.shouldNudge).toBe(false);
  });
});

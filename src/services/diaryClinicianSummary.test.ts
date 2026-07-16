// @vitest-environment node
import { describe, it, expect } from "vitest";
import { summarizeDiaryForClinician } from "./diaryClinicianSummary";
import type { DiaryCardEntry } from "../types";

function entry(overrides: Partial<DiaryCardEntry> & { date: string }): DiaryCardEntry {
  return {
    emotions: { misery: 0, shame: 0, anger: 0, fear: 0, joy: 0, love: 0 },
    skillsUsed: [],
    ...overrides,
  };
}

describe("summarizeDiaryForClinician", () => {
  it("counts days logged within the period", () => {
    const entries = [
      entry({ date: "2026-07-01" }),
      entry({ date: "2026-07-05" }),
      entry({ date: "2026-06-01" }), // outside window
    ];
    const summary = summarizeDiaryForClinician(entries, "2026-07-01", 30);
    expect(summary.daysLogged).toBe(2);
    expect(summary.periodDays).toBe(30);
  });

  it("computes average and peak intensity per urge, and days acted on", () => {
    const entries = [
      entry({
        date: "2026-07-01",
        urges: [{ key: "selfHarm", label: "Urge to self-harm", intensity: 2, actedOn: false }],
      }),
      entry({
        date: "2026-07-02",
        urges: [{ key: "selfHarm", label: "Urge to self-harm", intensity: 4, actedOn: true }],
      }),
    ];
    const summary = summarizeDiaryForClinician(entries, "2026-07-01", 30);
    const selfHarm = summary.urges.find((u) => u.key === "selfHarm");
    expect(selfHarm).toBeDefined();
    expect(selfHarm!.avgIntensity).toBeCloseTo(3);
    expect(selfHarm!.peakIntensity).toBe(4);
    expect(selfHarm!.daysActedOn).toBe(1);
  });

  it("computes emotion averages and peaks across logged days", () => {
    const entries = [
      entry({ date: "2026-07-01", emotions: { misery: 1, shame: 0, anger: 0, fear: 0, joy: 2, love: 0 } }),
      entry({ date: "2026-07-02", emotions: { misery: 3, shame: 0, anger: 0, fear: 0, joy: 4, love: 0 } }),
    ];
    const summary = summarizeDiaryForClinician(entries, "2026-07-01", 30);
    expect(summary.emotionAverages.misery).toBeCloseTo(2);
    expect(summary.emotionPeaks.misery).toBe(3);
    expect(summary.avgMisery).toBeCloseTo(2);
  });

  it("tallies skill effectiveness across days", () => {
    const entries = [
      entry({ date: "2026-07-01", skillsUsed: ["TIPP"], skillEffectiveness: { TIPP: "tried_helped" } }),
      entry({ date: "2026-07-02", skillsUsed: ["TIPP", "DEAR MAN"], skillEffectiveness: { TIPP: "tried_no_help", "DEAR MAN": "tried_helped" } }),
    ];
    const summary = summarizeDiaryForClinician(entries, "2026-07-01", 30);
    const tipp = summary.skills.find((s) => s.skill === "TIPP");
    expect(tipp).toEqual({ skill: "TIPP", timesUsed: 2, timesHelped: 1, timesNoHelp: 1 });
    const dearMan = summary.skills.find((s) => s.skill === "DEAR MAN");
    expect(dearMan).toEqual({ skill: "DEAR MAN", timesUsed: 1, timesHelped: 1, timesNoHelp: 0 });
  });

  it("flags notable days: acted-on urges or high misery", () => {
    const entries = [
      entry({ date: "2026-07-01", emotions: { misery: 1, shame: 0, anger: 0, fear: 0, joy: 0, love: 0 } }),
      entry({
        date: "2026-07-02",
        emotions: { misery: 5, shame: 0, anger: 0, fear: 0, joy: 0, love: 0 },
      }),
      entry({
        date: "2026-07-03",
        urges: [{ key: "suicidal", label: "Suicidal urge", intensity: 2, actedOn: true }],
      }),
    ];
    const summary = summarizeDiaryForClinician(entries, "2026-07-01", 30);
    const dates = summary.notableDays.map((d) => d.date);
    expect(dates).toContain("2026-07-02");
    expect(dates).toContain("2026-07-03");
    expect(dates).not.toContain("2026-07-01");
  });

  it("returns empty urges/skills when nothing logged, without throwing", () => {
    const summary = summarizeDiaryForClinician([], "2026-07-01", 30);
    expect(summary.daysLogged).toBe(0);
    expect(summary.urges).toEqual([]);
    expect(summary.skills).toEqual([]);
    expect(summary.avgMisery).toBeNull();
  });
});

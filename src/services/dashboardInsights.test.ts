import { describe, it, expect } from "vitest";
import { emotionDistribution, derivedObservations } from "./dashboardInsights";
import type { CheckInEntry, DiaryCardEntry } from "../types";

// real stripProvenance behavior (case-preserving), inlined so the test is self-contained
const strip = (e: string) => e.replace(/\s*\([^)]*\)\s*$/, "").trim();

const ci = (emotion: string): CheckInEntry => ({
  id: "ch_" + Math.random(),
  date: "2026-06-20",
  timestamp: "10:00:00",
  emotion,
  intensity: 5,
  context: "Nila check-in",
});

describe("emotionDistribution", () => {
  it("merges provenance-suffixed and bare emotions into one bucket", () => {
    const out = emotionDistribution(
      [ci("Anxious (Nila)"), ci("Anxious (One-Tap)"), ci("Anxious"), ci("Calm")],
      strip
    );
    const anxious = out.find((b) => b.name === "Anxious");
    expect(anxious?.value).toBe(3);
    expect(out.find((b) => b.name === "Calm")?.value).toBe(1);
    // the raw suffixed strings must NOT appear as separate bars
    expect(out.some((b) => b.name.includes("("))).toBe(false);
  });

  it("preserves case (does not lowercase the base label)", () => {
    const out = emotionDistribution([ci("Overwhelmed (Nila)")], strip);
    expect(out[0].name).toBe("Overwhelmed");
  });

  it("returns bars sorted by count descending", () => {
    const out = emotionDistribution(
      [ci("Low"), ci("Low"), ci("Low"), ci("Angry"), ci("Angry"), ci("Calm")],
      strip
    );
    expect(out.map((b) => b.name)).toEqual(["Low", "Angry", "Calm"]);
  });

  it("returns [] for no check-ins", () => {
    expect(emotionDistribution([], strip)).toEqual([]);
  });
});

const ciOn = (date: string, intensity: number): CheckInEntry => ({
  id: "ch_" + Math.random(), date, timestamp: "10:00:00",
  emotion: "Low", intensity, context: "Nila check-in",
});

const diary = (over: Partial<DiaryCardEntry>): DiaryCardEntry => ({
  date: "2026-06-20",
  emotions: { misery: 1, shame: 0, anger: 0, fear: 0, joy: 4, love: 0 },
  skillsUsed: [],
  ...over,
});

describe("derivedObservations", () => {
  it("returns [] when there are no check-ins", () => {
    expect(derivedObservations([], [])).toEqual([]);
  });

  it("names the highest-average distress day of week", () => {
    // 2026-06-15 is a Monday; give it the highest average
    const out = derivedObservations(
      [ciOn("2026-06-15", 9), ciOn("2026-06-16", 2)],
      []
    );
    expect(out.some((s) => s.includes("Monday"))).toBe(true);
  });

  it("names the most-used diary skill", () => {
    const out = derivedObservations(
      [ciOn("2026-06-15", 5)],
      [diary({ skillsUsed: ["TIPP", "TIPP", "STOP"] })]
    );
    expect(out.some((s) => s.includes("TIPP"))).toBe(true);
  });

  it("never contains a hard-coded correlation phrase", () => {
    const out = derivedObservations([ciOn("2026-06-15", 5)], [diary({})]);
    expect(out.some((s) => s.includes("1.8 points") || s.includes("60%"))).toBe(false);
  });
});

import { episodePatterns, quickNoteTags } from "./dashboardInsights";
import type { EpisodeRecord } from "../types";

const ep = (over: Partial<EpisodeRecord>): EpisodeRecord => ({
  id: "ep_" + Math.random(), date: "2026-06-20", time: "22:00", dayOfWeek: "Sat",
  timeOfDay: "night", trigger: null, skillsHelpful: [],
  startIntensity: 9, peakIntensity: 9, endIntensity: 4, durationMinutes: 20,
  humanContactPrompted: false, crisisLineShown: false,
  ...over,
});

describe("episodePatterns", () => {
  it("returns null with no episodes", () => {
    expect(episodePatterns([])).toBeNull();
  });

  it("computes most common time, avg duration, avg drop, count", () => {
    const out = episodePatterns([
      ep({ timeOfDay: "night", durationMinutes: 30, startIntensity: 9, endIntensity: 3 }),
      ep({ timeOfDay: "night", durationMinutes: 10, startIntensity: 8, endIntensity: 6 }),
    ])!;
    expect(out.mostCommonTime).toBe("night");
    expect(out.avgDuration).toBe(20);
    expect(out.avgDrop).toBe("4.0"); // ((9-3)+(8-6))/2 = 4.0, string
    expect(out.totalCount).toBe(2);
  });

  it("never counts negative drops (clamps at 0)", () => {
    const out = episodePatterns([ep({ startIntensity: 4, endIntensity: 9 })])!;
    expect(out.avgDrop).toBe("0.0");
  });
});

describe("quickNoteTags", () => {
  const d = (tags?: string[]): import("../types").DiaryCardEntry => ({
    date: "2026-06-20",
    emotions: { misery: 0, shame: 0, anger: 0, fear: 0, joy: 0, love: 0 },
    skillsUsed: [],
    quickNoteTags: tags,
  });

  it("lowercases, trims, counts and sorts descending; tolerates missing tags", () => {
    const out = quickNoteTags([d(["Work ", "work", "Sleep"]), d(undefined)]);
    expect(out[0]).toEqual(["work", 2]);
    expect(out).toContainEqual(["sleep", 1]);
  });

  it("caps at 10 tags", () => {
    const many = Array.from({ length: 15 }, (_, i) => `t${i}`);
    expect(quickNoteTags([d(many)]).length).toBe(10);
  });
});

import { moodTrend, contextTrend } from "./dashboardInsights";
import type { MoodPoint } from "./patternInsights";

const mp = (date: string, intensity: number | null, sleepHours: number | null = null, social: number | null = null): MoodPoint =>
  ({ date, intensity, shame: null, sleepHours, social });

describe("moodTrend", () => {
  it("sorts ascending by date then slices the last N (range)", () => {
    const out = moodTrend([mp("2026-06-03", 3), mp("2026-06-01", 1), mp("2026-06-02", 2)], "30d");
    expect(out.map((p) => p.intensity)).toEqual([1, 2, 3]);
  });

  it("limits to 7 most-recent days for 7d", () => {
    const days = Array.from({ length: 10 }, (_, i) =>
      mp(`2026-06-${String(i + 1).padStart(2, "0")}`, i)
    );
    const out = moodTrend(days, "7d");
    expect(out.length).toBe(7);
    expect(out[0].intensity).toBe(3); // days 4..10 kept
    expect(out[out.length - 1].intensity).toBe(9);
  });

  it("keeps null-intensity days (averaged source may have none) as null points", () => {
    const out = moodTrend([mp("2026-06-01", null), mp("2026-06-02", 5)], "30d");
    expect(out[0].intensity).toBeNull();
  });

  it("labels date as mm-dd", () => {
    expect(moodTrend([mp("2026-06-09", 4)], "30d")[0].date).toBe("06-09");
  });
});

describe("contextTrend", () => {
  it("maps sleep/social with 0 fallback, sorted+sliced", () => {
    const out = contextTrend([mp("2026-06-02", 5, 7, 8), mp("2026-06-01", 5, null, null)], "30d");
    expect(out[0]).toEqual({ date: "06-01", sleepHours: 0, social: 0 });
    expect(out[1]).toEqual({ date: "06-02", sleepHours: 7, social: 8 });
  });
});

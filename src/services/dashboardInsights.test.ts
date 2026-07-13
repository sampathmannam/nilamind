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

  it("names the highest-average distress day of week once the minimum sample size is met", () => {
    // 2026-06-15 and 2026-06-22 are both Mondays (>=2 samples in that bucket, >=5 total logs) —
    // the sample-size floor exists so one lone extreme day can't masquerade as a pattern (Polhemus
    // et al., 2022, JMIR Mental Health: negative-emphasis framing risks disengagement, so this
    // should only fire on a real signal).
    const out = derivedObservations(
      [
        ciOn("2026-06-15", 9),
        ciOn("2026-06-22", 8),
        ciOn("2026-06-16", 2),
        ciOn("2026-06-17", 2),
        ciOn("2026-06-18", 3),
      ],
      []
    );
    expect(out.some((s) => s.includes("Monday"))).toBe(true);
  });

  it("uses softened, non-absolute language for the worst-weekday callout (Polhemus et al., 2022)", () => {
    const out = derivedObservations(
      [
        ciOn("2026-06-15", 9),
        ciOn("2026-06-22", 8),
        ciOn("2026-06-16", 2),
        ciOn("2026-06-17", 2),
        ciOn("2026-06-18", 3),
      ],
      []
    );
    const line = out.find((s) => s.includes("Monday"));
    expect(line).toBeDefined();
    // No longer an unqualified absolute claim ("has been highest on average ... over the tracked period").
    expect(line).not.toMatch(/highest on average/i);
  });

  it("does not surface a worst-weekday callout below the minimum total sample size", () => {
    // Only 2 total logs — same shape as the old under-powered fixture; too little data to name a day.
    const out = derivedObservations(
      [ciOn("2026-06-15", 9), ciOn("2026-06-16", 2)],
      []
    );
    expect(out.some((s) => /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/.test(s))).toBe(false);
  });

  it("does not surface a worst-weekday callout when every weekday bucket is a single-sample outlier", () => {
    // 5 total logs (meets the total floor) but every weekday bucket has exactly 1 sample —
    // no bucket meets the per-day floor, so no day should be singled out.
    const out = derivedObservations(
      [
        ciOn("2026-06-15", 9), // Mon
        ciOn("2026-06-16", 2), // Tue
        ciOn("2026-06-17", 2), // Wed
        ciOn("2026-06-18", 3), // Thu
        ciOn("2026-06-19", 3), // Fri
      ],
      []
    );
    expect(out.some((s) => /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/.test(s))).toBe(false);
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

import { moodTrend, contextTrend, sleepMoodTrend, weeklyRhythmBars } from "./dashboardInsights";
import type { MoodPoint } from "./patternInsights";
function checkin(date: string, intensity: number): CheckInEntry {
  return { id: "t", date, timestamp: `${date}T12:00:00.000Z`, emotion: "Low", intensity, context: "" };
}

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

describe("weeklyRhythmBars", () => {
  it("returns empty for no check-ins", () => {
    expect(weeklyRhythmBars([])).toEqual([]);
  });

  it("groups by day-of-week and computes average", () => {
    // 2026-01-05 is Monday; 2026-01-06 Tuesday
    const out = weeklyRhythmBars([
      checkin("2026-01-05", 4),
      checkin("2026-01-05", 6),
      checkin("2026-01-06", 3),
    ]);
    const monday = out.find((b) => b.day === "Monday");
    expect(monday).toBeDefined();
    expect(monday!.avg).toBe(5); // (4+6)/2
    expect(monday!.count).toBe(2);
    const tuesday = out.find((b) => b.day === "Tuesday");
    expect(tuesday!.avg).toBe(3);
    expect(tuesday!.count).toBe(1);
  });

  it("skips days with no data", () => {
    const out = weeklyRhythmBars([checkin("2026-01-05", 5)]); // Monday
    expect(out.length).toBe(1);
    expect(out[0].day).toBe("Monday");
  });

  it("sorts by weekday order", () => {
    const out = weeklyRhythmBars([
      checkin("2026-01-09", 4), // Friday
      checkin("2026-01-05", 5), // Monday
      checkin("2026-01-06", 3), // Tuesday
    ]);
    expect(out.map((b) => b.day)).toEqual(["Monday", "Tuesday", "Friday"]);
  });
});

describe("sleepMoodTrend", () => {
  it("maps sleep+intensity, sorts ascending, slices to range", () => {
    const out = sleepMoodTrend([
      mp("2026-06-03", 8, 6),
      mp("2026-06-01", 3, 9),
      mp("2026-06-02", 5, 7),
    ], "30d");
    expect(out).toEqual([
      { date: "06-01", sleepHours: 9, intensity: 3 },
      { date: "06-02", sleepHours: 7, intensity: 5 },
      { date: "06-03", sleepHours: 6, intensity: 8 },
    ]);
  });

  it("falls back null intensity to null, sleep to 0", () => {
    const out = sleepMoodTrend([mp("2026-06-01", null, null)], "30d");
    expect(out[0]).toEqual({ date: "06-01", sleepHours: 0, intensity: null });
  });
});

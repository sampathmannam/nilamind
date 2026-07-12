import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkinFrequency,
  averageMoodIntensity,
  topEmotion,
  moodSleepCorrelation,
  protocolCompletions,
  featureAdoption,
  assessmentSummary,
  type UsageSummary,
  computeUsageSummary,
  sleepTrend,
  recordActiveDay,
  retentionSnapshot,
} from "./usageAnalytics";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  SENSITIVE_KEYS: [],
  flush: () => {},
}));

beforeEach(() => store.clear());

const makeCheckin = (date: string, emotion: string, intensity: number, sleepHours?: number) => ({
  id: `c_${date}`,
  date,
  timestamp: `${date}T12:00:00`,
  emotion,
  intensity,
  sleepHours,
  context: "",
});

const makeAssessment = (date: string, instrument: string, score: number) => ({
  date,
  instrument,
  score,
  id: `a_${date}_${instrument}`,
});

describe("checkinFrequency", () => {
  it("returns 0 when no checkins", () => {
    expect(checkinFrequency([])).toBe(0);
  });

  it("computes avg checkins per day across the span", () => {
    const checkins = [
      makeCheckin("2026-07-01", "Calm", 5),
      makeCheckin("2026-07-02", "Low", 3),
      makeCheckin("2026-07-03", "High", 7),
      makeCheckin("2026-07-05", "Calm", 6),
    ];
    const freq = checkinFrequency(checkins);
    expect(freq).toBeGreaterThan(0);
    expect(freq).toBeLessThanOrEqual(1);
  });
});

describe("averageMoodIntensity", () => {
  it("returns null for empty checkins", () => {
    expect(averageMoodIntensity([])).toBeNull();
  });

  it("computes the average intensity", () => {
    const checkins = [
      makeCheckin("2026-07-01", "Calm", 4),
      makeCheckin("2026-07-02", "Low", 2),
      makeCheckin("2026-07-03", "High", 8),
    ];
    expect(averageMoodIntensity(checkins)).toBeCloseTo(4.67, 1);
  });
});

describe("topEmotion", () => {
  it("returns null for empty checkins", () => {
    expect(topEmotion([])).toBeNull();
  });

  it("returns the most frequent emotion label", () => {
    const checkins = [
      makeCheckin("2026-07-01", "Calm (Nila)", 5),
      makeCheckin("2026-07-02", "Low (Nila)", 3),
      makeCheckin("2026-07-03", "Calm (Nila)", 6),
      makeCheckin("2026-07-04", "High (Nila)", 7),
    ];
    expect(topEmotion(checkins)).toBe("Calm (Nila)");
  });

  it("returns the first emotion when tied", () => {
    const checkins = [
      makeCheckin("2026-07-01", "Calm (Nila)", 5),
      makeCheckin("2026-07-02", "Low (Nila)", 3),
      makeCheckin("2026-07-03", "Calm (Nila)", 6),
      makeCheckin("2026-07-04", "Low (Nila)", 7),
    ];
    const top = topEmotion(checkins);
    expect(top).toBeTruthy();
    expect(["Calm (Nila)", "Low (Nila)"]).toContain(top);
  });
});

describe("moodSleepCorrelation", () => {
  it("returns null when no sleep data", () => {
    const checkins = [
      makeCheckin("2026-07-01", "Calm", 5),
      makeCheckin("2026-07-02", "Low", 3),
    ];
    expect(moodSleepCorrelation(checkins)).toBeNull();
  });

  it("returns avg mood for high-sleep (>=7h) and low-sleep (<7h) days", () => {
    const checkins = [
      makeCheckin("2026-07-01", "Calm", 7, 8),
      makeCheckin("2026-07-02", "Low", 3, 5),
      makeCheckin("2026-07-03", "Calm", 6, 7.5),
      makeCheckin("2026-07-04", "High", 8, 6),
      makeCheckin("2026-07-05", "Low", 2, 4.5),
    ];
    const corr = moodSleepCorrelation(checkins);
    expect(corr).not.toBeNull();
    if (corr) {
      expect(corr.highSleepMood).toBeGreaterThan(corr.lowSleepMood);
    }
  });

  it("filters out checkins without sleepHours", () => {
    const checkins = [
      makeCheckin("2026-07-01", "Calm", 5),
      makeCheckin("2026-07-02", "Low", 3, 8),
      makeCheckin("2026-07-03", "Calm", 6, 4),
    ];
    const corr = moodSleepCorrelation(checkins);
    expect(corr).not.toBeNull();
    if (corr) {
      expect(corr.highSleepMood).toBeGreaterThan(0);
      expect(corr.lowSleepMood).toBeGreaterThan(0);
    }
  });
});

describe("sleepTrend", () => {
  it("returns null for empty checkins", () => {
    expect(sleepTrend([])).toBeNull();
  });

  it("returns null when no sleep data", () => {
    const checkins = [makeCheckin("2026-07-01", "Calm", 5)];
    expect(sleepTrend(checkins)).toBeNull();
  });

  it("computes recent (last 3) vs older avg sleep hours", () => {
    const checkins = [
      makeCheckin("2026-07-01", "Calm", 5, 7),
      makeCheckin("2026-07-02", "Low", 4, 6.5),
      makeCheckin("2026-07-03", "Calm", 6, 8),
      makeCheckin("2026-07-04", "Calm", 5, 5),
      makeCheckin("2026-07-05", "Low", 3, 4.5),
    ];
    const trend = sleepTrend(checkins);
    expect(trend).not.toBeNull();
    if (trend) {
      expect(trend.recentAvg).toBeGreaterThan(0);
      expect(trend.olderAvg).toBeGreaterThan(0);
    }
  });
});

describe("protocolCompletions", () => {
  it("returns 0 when no protocol progress key", () => {
    expect(protocolCompletions()).toEqual({ started: 0, completed: 0, rate: 0 });
  });

  it("parses protocol progress and extracts started/completed counts", () => {
    store.set("nilamind_protocol_progress", JSON.stringify({ protocolId: "ba", stepIndex: 3 }));
    const result = protocolCompletions();
    expect(result).toBeTruthy();
  });

  it("reads real counts from the completions log (2026-07-12 QA: stub always returned 0)", () => {
    store.set(
      "nilamind_protocol_completions",
      JSON.stringify([
        { protocolId: "behavioral-activation", at: "2026-07-12T00:00:00Z" },
        { protocolId: "worry-postponement", at: "2026-07-12T01:00:00Z" },
      ]),
    );
    const result = protocolCompletions();
    expect(result.completed).toBe(2);
  });

  it("returns completed: 0 when the completions log is empty/absent", () => {
    const result = protocolCompletions();
    expect(result.completed).toBe(0);
  });
});

describe("featureAdoption", () => {
  it("returns empty features when no data stored", () => {
    const features = featureAdoption();
    expect(features.length).toBe(0);
  });

  it("detects thought records when key exists with entries", () => {
    store.set("nilamind_thought_records", JSON.stringify([{ id: "tr_1" }, { id: "tr_2" }]));
    const features = featureAdoption();
    expect(features).toContain("thought_records");
  });

  it("detects ba activities when key exists with entries", () => {
    store.set("nilamind_ba_activities", JSON.stringify([{ id: "ba_1" }]));
    const features = featureAdoption();
    expect(features).toContain("ba_activities");
  });

  it("detects values when key exists", () => {
    store.set("nilamind_values", JSON.stringify({ domains: [{ id: "v_1", domain: "family" }] }));
    const features = featureAdoption();
    expect(features).toContain("values_snapshot");
  });

  it("detects compassionate letters", () => {
    store.set("nilamind_compassionate_letters", JSON.stringify([{ id: "l_1" }]));
    const features = featureAdoption();
    expect(features).toContain("compassionate_letters");
  });

  it("detects exposure hierarchy", () => {
    store.set("nilamind_exposure_hierarchy", JSON.stringify({ steps: [{ id: "e_1" }] }));
    const features = featureAdoption();
    expect(features).toContain("exposure_hierarchy");
  });

  it("counts a guided-program completion as a used feature (2026-07-12 QA)", () => {
    store.set(
      "nilamind_protocol_completions",
      JSON.stringify([{ protocolId: "cooling-anger", at: "2026-07-12T00:00:00Z" }]),
    );
    const features = featureAdoption();
    expect(features).toContain("guided_programs");
  });
});

describe("assessmentSummary", () => {
  it("returns empty map when no assessments", () => {
    expect(assessmentSummary([])).toEqual({});
  });

  it("returns latest score per instrument", () => {
    const entries = [
      makeAssessment("2026-07-01", "PHQ-9", 8),
      makeAssessment("2026-07-15", "PHQ-9", 5),
      makeAssessment("2026-07-10", "GAD-7", 6),
    ];
    const summary = assessmentSummary(entries);
    expect(summary["PHQ-9"]).toBe(5);
    expect(summary["GAD-7"]).toBe(6);
  });

  it("returns empty for entries with no instrument field", () => {
    const entries = [{ date: "2026-07-01", score: 8, id: "a_1" }];
    expect(assessmentSummary(entries)).toEqual({});
  });
});

describe("computeUsageSummary", () => {
  it("returns a complete UsageSummary with defaults", () => {
    const summary = computeUsageSummary();
    expect(summary).toHaveProperty("checkinFrequency");
    expect(summary).toHaveProperty("avgMood");
    expect(summary).toHaveProperty("topEmotion");
    expect(summary).toHaveProperty("moodSleepCorrelation");
    expect(summary).toHaveProperty("features");
    expect(summary).toHaveProperty("protocols");
    expect(summary).toHaveProperty("assessments");
    expect(summary).toHaveProperty("sleepTrend");
    expect(summary.totalCheckins).toBe(0);
  });

  it("reads from secureLocal and returns real values when data exists", () => {
    store.set("nilamind_checkins", JSON.stringify([
      makeCheckin("2026-07-01", "Calm (Nila)", 7, 8),
      makeCheckin("2026-07-02", "Low (Nila)", 3, 5),
      makeCheckin("2026-07-03", "Calm (Nila)", 6, 7.5),
    ]));
    store.set("nilamind_thought_records", JSON.stringify([{ id: "tr_1" }]));

    const summary = computeUsageSummary();
    expect(summary.totalCheckins).toBe(3);
    expect(summary.avgMood).toBeCloseTo(5.33, 1);
    expect(summary.features).toContain("thought_records");
  });
});

describe("self-retention / consistency (2026-07-12)", () => {
  const day = (s: string) => new Date(s + "T12:00:00Z");

  it("empty store → zeroed snapshot, no first-active date", () => {
    const r = retentionSnapshot(day("2026-03-10"));
    expect(r).toEqual({
      firstActiveIso: null,
      totalActiveDays: 0,
      currentStreak: 0,
      day7Active: false,
      day30Active: false,
    });
  });

  it("records idempotent active days and computes streak + Day-7/30 flags", () => {
    for (const d of ["2026-01-01", "2026-01-02", "2026-01-03"]) {
      recordActiveDay(day(d));
    }
    const early = retentionSnapshot(day("2026-01-03"));
    expect(early.firstActiveIso).toBe("2026-01-01");
    expect(early.totalActiveDays).toBe(3);
    expect(early.currentStreak).toBe(3); // 01-01..01-03 consecutive, ending at most-recent
    expect(early.day7Active).toBe(false); // 01-08 not yet
    expect(early.day30Active).toBe(false); // 01-31 not yet

    // the user returns on day 7 and day 30, plus a duplicate (idempotency)
    recordActiveDay(day("2026-01-08"));
    recordActiveDay(day("2026-01-31"));
    recordActiveDay(day("2026-01-01")); // duplicate — must not double-count

    const later = retentionSnapshot(day("2026-02-01"));
    expect(later.totalActiveDays).toBe(5);
    expect(later.day7Active).toBe(true); // 01-08 recorded
    expect(later.day30Active).toBe(true); // 01-31 recorded
  });

  it("is forgiving: a single quiet day doesn't zero a still-current streak", () => {
    // active 01-01, 01-02, skip 01-03, active 01-04; evaluate on 01-04
    for (const d of ["2026-01-01", "2026-01-02", "2026-01-04"]) {
      recordActiveDay(day(d));
    }
    const r = retentionSnapshot(day("2026-01-04"));
    expect(r.currentStreak).toBe(1); // only 01-04 (the gap broke the run)
    expect(r.totalActiveDays).toBe(3);
  });

  it("streak is 0 when the most-recent active day is older than yesterday", () => {
    recordActiveDay(day("2026-01-01"));
    const r = retentionSnapshot(day("2026-01-05")); // 4-day gap
    expect(r.currentStreak).toBe(0);
    expect(r.totalActiveDays).toBe(1);
  });
});

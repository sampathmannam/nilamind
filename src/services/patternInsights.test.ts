import { describe, it, expect } from "vitest";
import { generateInsights, daysOfData, medicationMoodInsight, type MoodPoint } from "./patternInsights";
import type { BehaviourSnapshot } from "./phoneBehaviour";
import type { MedicationLog } from "./medicationAdherence";

function medLog(overrides: Partial<MedicationLog> & { date: string }): MedicationLog {
  return {
    id: "mlog_test",
    medId: "med_test",
    taken: true,
    takenAt: "08:00",
    sideEffects: [],
    ...overrides,
  };
}

function snap(overrides: Partial<BehaviourSnapshot> & { date: string }): BehaviourSnapshot {
  return {
    capturedAt: 0,
    source: "android",
    screenTimeMinutes: null,
    categoryMinutes: null,
    topApps: [],
    lastPickupTime: null,
    firstPickupTime: null,
    unlockCount: null,
    leftHome: null,
    maxDistanceKm: null,
    steps: null,
    callsMade: null,
    nightNotifications: null,
    ...overrides,
  };
}

function mood(overrides: Partial<MoodPoint> & { date: string }): MoodPoint {
  return { ...overrides };
}

// Helper: generate N paired days of sleep+ mood data
function sleepMoodPair(n: number, shortSleepMood: number, longSleepMood: number): { snaps: BehaviourSnapshot[]; mood: MoodPoint[] } {
  const snaps: BehaviourSnapshot[] = [];
  const moodPoints: MoodPoint[] = [];
  for (let i = 0; i < n * 2; i++) {
    const d = `2026-01-${String(i + 1).padStart(2, "0")}`;
    const isShort = i % 2 === 0;
    snaps.push(snap({ date: d, screenTimeMinutes: 60 }));
    moodPoints.push(mood({ date: d, intensity: isShort ? shortSleepMood : longSleepMood, sleepHours: isShort ? 4 : 8 }));
  }
  return { snaps, mood: moodPoints };
}

describe("generateInsights", () => {
  it("returns empty array when given no data", () => {
    expect(generateInsights([], [])).toEqual([]);
  });

  it("returns insights when enough paired data exists", () => {
    // 12 days: 6 short-sleep (4h, mood 7) + 6 long-sleep (8h, mood 3)
    const { snaps, mood: moodPoints } = sleepMoodPair(6, 7, 3);
    const insights = generateInsights(snaps, moodPoints);
    // At least one insight should be returned (sleepVsMood)
    expect(insights.length).toBeGreaterThanOrEqual(1);
    expect(insights.some((i) => i.id === "sleep-short")).toBe(true);
  });

  it("returns empty when groups are too small (MIN_GROUP=5)", () => {
    // Only 3 days each — below MIN_GROUP threshold
    const { snaps, mood: moodPoints } = sleepMoodPair(3, 8, 3);
    const insights = generateInsights(snaps, moodPoints);
    expect(insights.find((i) => i.id === "sleep-short")).toBeUndefined();
  });

  it("each insight has required fields", () => {
    const { snaps, mood: moodPoints } = sleepMoodPair(6, 7, 3);
    for (const ins of generateInsights(snaps, moodPoints)) {
      expect(ins.id).toBeTruthy();
      expect(ins.title).toBeTruthy();
      expect(ins.finding).toBeTruthy();
      expect(ins.dataPoints).toBeGreaterThanOrEqual(10); // MIN_GROUP * 2
      expect(["risk", "protective", "neutral"]).toContain(ins.direction);
      expect(ins.basis).toBeTruthy();
    }
  });
});

describe("medicationMoodInsight", () => {
  it("returns null when no med logs", () => {
    expect(medicationMoodInsight([], [])).toBeNull();
  });

  it("returns null when groups are below MIN_GROUP", () => {
    const moodPoints: MoodPoint[] = [
      { date: "2026-01-01", intensity: 5 },
      { date: "2026-01-02", intensity: 6 },
    ];
    const logs = [
      medLog({ date: "2026-01-01", taken: true }),
      medLog({ date: "2026-01-02", taken: false }),
    ];
    expect(medicationMoodInsight(logs, moodPoints)).toBeNull();
  });

  it("returns insight when mood is better on fully-adherent days", () => {
    // 6 "all taken" days (intensity 3) + 6 "missed dose" days (intensity 7)
    const moodPoints: MoodPoint[] = [];
    const logs: MedicationLog[] = [];
    for (let i = 0; i < 6; i++) {
      const dTaken = `2026-01-${String(i + 1).padStart(2, "0")}`;
      moodPoints.push({ date: dTaken, intensity: 3 });
      logs.push(medLog({ date: dTaken, taken: true }));
      logs.push(medLog({ date: dTaken, taken: true })); // 2 meds = all taken
      const dMissed = `2026-01-${String(i + 7).padStart(2, "0")}`;
      moodPoints.push({ date: dMissed, intensity: 7 });
      logs.push(medLog({ date: dMissed, taken: false }));
    }
    const insight = medicationMoodInsight(logs, moodPoints);
    expect(insight).not.toBeNull();
    expect(insight!.id).toBe("medication-adherence");
    expect(insight!.direction).toBe("protective");
    expect(insight!.dataPoints).toBe(12); // 6 taken + 6 missed days
  });

  it("returns null when mood diff is < 1.0", () => {
    const moodPoints: MoodPoint[] = [];
    const logs: MedicationLog[] = [];
    for (let i = 0; i < 6; i++) {
      const dTaken = `2026-01-${String(i + 1).padStart(2, "0")}`;
      moodPoints.push({ date: dTaken, intensity: 5 });
      logs.push(medLog({ date: dTaken, taken: true }));
      const dMissed = `2026-01-${String(i + 7).padStart(2, "0")}`;
      moodPoints.push({ date: dMissed, intensity: 5.4 });
      logs.push(medLog({ date: dMissed, taken: false }));
    }
    expect(medicationMoodInsight(logs, moodPoints)).toBeNull();
  });

  it("skips mood points without intensity", () => {
    const moodPoints: MoodPoint[] = [
      { date: "2026-01-01", intensity: 5 },
      { date: "2026-01-02", intensity: null },
    ];
    const logs = [
      medLog({ date: "2026-01-01", taken: true }),
      medLog({ date: "2026-01-02", taken: false }),
    ];
    // Only 1 log matches, below MIN_GROUP
    expect(medicationMoodInsight(logs, moodPoints)).toBeNull();
  });
});

describe("daysOfData", () => {
  it("returns 0 for empty inputs", () => {
    expect(daysOfData([], [])).toBe(0);
  });

  it("counts days with both screen time and mood intensity", () => {
    const snaps = [snap({ date: "2026-01-01", screenTimeMinutes: 60 }), snap({ date: "2026-01-02", screenTimeMinutes: 90 })];
    const moodPoints = [mood({ date: "2026-01-01", intensity: 5 }), mood({ date: "2026-01-03", intensity: 6 })];
    expect(daysOfData(snaps, moodPoints)).toBe(1); // only Jan-01 overlaps
  });
});

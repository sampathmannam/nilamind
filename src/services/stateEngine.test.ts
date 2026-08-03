import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "web", isNativePlatform: () => false },
  registerPlugin: vi.fn(() => ({})),
}));

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
});

vi.mock("./sleepInsight", () => ({
  selfReportSleepSignal: vi.fn(() => null),
  selfReportedSleepNights: vi.fn(() => []),
}));

vi.mock("./circadian", () => ({
  computeCircadianInsight: vi.fn(() => ({ irregular: false, note: "", nights: 0 })),
}));

vi.mock("./patternInsights", () => ({
  generateInsights: vi.fn(() => []),
  assessmentInsights: vi.fn(() => []),
}));

vi.mock("./nilaInflection", () => ({
  topFireableSignal: vi.fn(() => null),
}));

vi.mock("./inflectionPrefs", () => ({
  getInflectionEnabled: vi.fn(() => false),
}));

vi.mock("./jitaiEngine", () => ({
  assessJitai: vi.fn(() => ({ shouldNudge: false, triggers: [] })),
}));

vi.mock("./usageAnalytics", () => ({
  computeUsageSummary: vi.fn(() => ({})),
}));

vi.mock("./behaviouralActivation", () => ({
  loadActivities: vi.fn(() => []),
  computeInsight: vi.fn(() => null),
}));

vi.mock("./streaks", () => ({
  computeCompassionateStreak: vi.fn(() => ({ current: 0, longest: 0 })),
}));

vi.mock("./secureLocal", () => ({
  secureLocal: { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() },
}));

vi.mock("./moodHistory", () => ({
  loadMoodHistory: vi.fn(() => []),
}));

import { runStateEngine } from "./stateEngine";

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe("runStateEngine", () => {
  const minimalParams = {
    checkins: [],
    mood: [],
    assessments: [],
    diary: [],
    episodes: [],
    snaps: [],
    daysSinceLastCheckin: 0,
  };

  it("returns an object with moodState field", () => {
    const result = runStateEngine(minimalParams);
    expect(result).toHaveProperty("moodState");
    expect(typeof result.moodState).toBe("string");
  });

  it("returns an object with moodConfidence field", () => {
    const result = runStateEngine(minimalParams);
    expect(result).toHaveProperty("moodConfidence");
    expect(typeof result.moodConfidence).toBe("number");
    expect(result.moodConfidence).toBeGreaterThanOrEqual(0);
    expect(result.moodConfidence).toBeLessThanOrEqual(1);
  });

  it("returns an object with riskSignals array", () => {
    const result = runStateEngine(minimalParams);
    expect(result).toHaveProperty("riskSignals");
    expect(Array.isArray(result.riskSignals)).toBe(true);
  });

  it("returns an object with protectiveSignals array", () => {
    const result = runStateEngine(minimalParams);
    expect(result).toHaveProperty("protectiveSignals");
    expect(Array.isArray(result.protectiveSignals)).toBe(true);
  });

  it("returns valid output with empty checkins", () => {
    const result = runStateEngine({
      checkins: [],
      mood: [],
      assessments: [],
      diary: [],
      episodes: [],
      snaps: [],
      daysSinceLastCheckin: 5,
    });
    expect(result.moodState).toBe("calm");
    expect(result.moodConfidence).toBeLessThan(1);
    expect(result.riskSignals).toEqual([]);
    expect(result.protectiveSignals).toEqual([]);
  });
});

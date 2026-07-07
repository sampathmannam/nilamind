import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeStateDigest, stateDigestContextBlock, type StateDigest } from "./stateDigest";

// In-memory store for secureLocal mock
const store: Record<string, string> = {};
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
  },
}));

// Mock sleepInsight
vi.mock("./sleepInsight", () => ({
  selfReportSleepSignal: () => null,
}));

// Mock nilaInflection
vi.mock("./nilaInflection", () => ({
  topFireableSignal: () => null,
}));

// Mock streaks
vi.mock("./streaks", () => ({
  computeCompassionateStreak: () => null,
}));

// Mock assessments
vi.mock("./assessments", () => ({
  loadAssessments: () => [],
  latestFor: () => null,
  INSTRUMENTS: { "PHQ-9": { measures: "Depression", maxScore: 27 }, "GAD-7": { measures: "Anxiety", maxScore: 21 } },
}));

// Mock BA
vi.mock("./behaviouralActivation", () => ({
  loadActivities: () => [],
  computeInsight: () => ({ done: 0, planned: 0, avgMastery: null, avgPleasure: null, topCategory: null }),
}));

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

describe("computeStateDigest", () => {
  it("returns empty digest for no data", () => {
    const d = computeStateDigest();
    expect(d.recentCheckins).toBe(0);
    expect(d.avgDistress).toBeNull();
    expect(d.topEmotions).toEqual([]);
    expect(d.streak).toBe(0);
    expect(d.baDone).toBe(0);
    expect(d.sleepSignal).toBeNull();
    expect(d.inflection).toBeNull();
    expect(d.screeningBand).toBeNull();
  });

  it("computes recent checkins and avg distress", () => {
    const today = new Date();
    const checkins = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (4 - i));
      return {
        date: d.toISOString().split("T")[0],
        intensity: 3 + i,
        emotion: "anxious",
      };
    });
    store["nilamind_checkins"] = JSON.stringify(checkins);
    const d = computeStateDigest();
    expect(d.recentCheckins).toBe(5);
    expect(d.avgDistress).toBe(5); // (3+4+5+6+7)/5 = 5
  });

  it("extracts top emotions", () => {
    const today = new Date();
    const checkins = [0, 1, 2].map((i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return {
        date: d.toISOString().split("T")[0],
        intensity: 5,
        emotion: i < 2 ? "anxious" : "sad",
      };
    });
    store["nilamind_checkins"] = JSON.stringify(checkins);
    const d = computeStateDigest();
    expect(d.topEmotions).toContain("anxious");
  });
});

describe("stateDigestContextBlock", () => {
  it("returns empty string for empty digest", () => {
    expect(stateDigestContextBlock(computeStateDigest())).toBe("");
  });

  it("formats checkin summary when data exists", () => {
    const today = new Date();
    const checkins = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { date: d.toISOString().split("T")[0], intensity: 5, emotion: "anxious" };
    });
    store["nilamind_checkins"] = JSON.stringify(checkins);
    const block = stateDigestContextBlock(computeStateDigest());
    expect(block).toContain("check-in");
    expect(block).toContain("5");
  });
});

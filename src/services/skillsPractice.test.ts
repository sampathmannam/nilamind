import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeInsight, upsertPractice, loadPractices,
  type SkillPractice, type SkillFamily,
} from "./skillsPractice";

// In-memory store for secureLocal mock — mirrors BA test pattern exactly.
const store: Record<string, string> = {};
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
  },
}));

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

function makePractice(overrides: Partial<SkillPractice> & { id: string }): SkillPractice {
  return {
    date: "2026-01-15",
    timestamp: "10:00",
    skillId: "urge-surfing",
    family: "distress",
    ...overrides,
  };
}

describe("computeInsight", () => {
  it("returns zeros for empty data", () => {
    const ins = computeInsight([]);
    expect(ins.totalPractices).toBe(0);
    expect(ins.familyCounts).toEqual({});
    expect(ins.skillCounts).toEqual({});
    expect(ins.skillHelpedRates).toEqual({});
    expect(ins.avgUrgeDrop).toBeNull();
    expect(ins.familyBalance).toBe("none");
  });

  it("counts total practices", () => {
    const plays = [
      makePractice({ id: "p1" }),
      makePractice({ id: "p2" }),
      makePractice({ id: "p3" }),
    ];
    const ins = computeInsight(plays);
    expect(ins.totalPractices).toBe(3);
  });

  it("computes per-family counts", () => {
    const plays = [
      makePractice({ id: "p1", family: "crisis" }),
      makePractice({ id: "p2", family: "crisis" }),
      makePractice({ id: "p3", family: "emotion" }),
    ];
    const ins = computeInsight(plays);
    expect(ins.familyCounts).toEqual({ crisis: 2, emotion: 1 });
  });

  it("computes per-skill counts", () => {
    const plays = [
      makePractice({ id: "p1", skillId: "urge-surfing" }),
      makePractice({ id: "p2", skillId: "urge-surfing" }),
      makePractice({ id: "p3", skillId: "tipp" }),
    ];
    const ins = computeInsight(plays);
    expect(ins.skillCounts).toEqual({ "urge-surfing": 2, tipp: 1 });
  });

  it("computes skill helped rates from helped/no_help", () => {
    const plays = [
      makePractice({ id: "p1", skillId: "urge-surfing", helped: "helped" }),
      makePractice({ id: "p2", skillId: "urge-surfing", helped: "helped" }),
      makePractice({ id: "p3", skillId: "urge-surfing", helped: "no_help" }),
      makePractice({ id: "p4", skillId: "tipp", helped: "helped" }),
    ];
    const ins = computeInsight(plays);
    // urge-surfing: 2/3 helped → 0.667 (3 rated, >= 2 threshold)
    expect(ins.skillHelpedRates["urge-surfing"]).toBeCloseTo(2 / 3, 2);
    // tipp: only 1 rated — below threshold, not included
    expect(ins.skillHelpedRates["tipp"]).toBeUndefined();
  });

  it("requires >= 2 practices for helped rates (honest threshold)", () => {
    const plays = [
      makePractice({ id: "p1", skillId: "urge-surfing", helped: "helped" }),
    ];
    const ins = computeInsight(plays);
    // Only 1 practice — not enough to claim a rate
    expect(ins.skillHelpedRates["urge-surfing"]).toBeUndefined();
  });

  it("computes average urge drop when before/after ratings exist", () => {
    const plays = [
      makePractice({ id: "p1", urgeBefore: 4, intensityAfter: 1 }),
      makePractice({ id: "p2", urgeBefore: 5, intensityAfter: 2 }),
      makePractice({ id: "p3", urgeBefore: 3, intensityAfter: 0 }),
    ];
    const ins = computeInsight(plays);
    // urge drops: 3, 3, 3 → avg 3
    expect(ins.avgUrgeDrop).toBe(3);
  });

  it("returns null avgUrgeDrop when no before/after pairs exist", () => {
    const plays = [
      makePractice({ id: "p1" }),
      makePractice({ id: "p2" }),
    ];
    const ins = computeInsight(plays);
    expect(ins.avgUrgeDrop).toBeNull();
  });

  it("detects crisis-dominant family balance when crisis > 60%", () => {
    const plays = [
      makePractice({ id: "p1", family: "crisis" }),
      makePractice({ id: "p2", family: "crisis" }),
      makePractice({ id: "p3", family: "crisis" }),
      makePractice({ id: "p4", family: "emotion" }),
    ];
    const ins = computeInsight(plays);
    expect(ins.familyBalance).toBe("crisis_dominant");
  });

  it("detects balanced family when no family > 60%", () => {
    const plays = [
      makePractice({ id: "p1", family: "crisis" }),
      makePractice({ id: "p2", family: "crisis" }),
      makePractice({ id: "p3", family: "emotion" }),
      makePractice({ id: "p4", family: "emotion" }),
      makePractice({ id: "p5", family: "mindfulness" }),
    ];
    const ins = computeInsight(plays);
    expect(ins.familyBalance).toBe("balanced");
  });

  it("ignores practices without helped rating for helped rates", () => {
    const plays = [
      makePractice({ id: "p1", skillId: "urge-surfing", helped: "helped" }),
      makePractice({ id: "p2", skillId: "urge-surfing" }), // no helped rating
      makePractice({ id: "p3", skillId: "urge-surfing", helped: "no_help" }),
    ];
    const ins = computeInsight(plays);
    // 2 rated: 1/2 helped → 0.5
    expect(ins.skillHelpedRates["urge-surfing"]).toBe(0.5);
  });
});

describe("upsertPractice", () => {
  it("inserts a new practice", () => {
    const entry = makePractice({ id: "new-1" });
    const result = upsertPractice(entry);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("new-1");
  });

  it("updates an existing practice by id", () => {
    upsertPractice(makePractice({ id: "x" }));
    const result = upsertPractice(makePractice({ id: "x", helped: "helped" }));
    expect(result).toHaveLength(1);
    expect(result[0].helped).toBe("helped");
  });

  it("persists to encrypted store", () => {
    upsertPractice(makePractice({ id: "persist-1" }));
    const loaded = loadPractices();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("persist-1");
  });
});

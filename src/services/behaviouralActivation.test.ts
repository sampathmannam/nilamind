import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  categoryMeta, computeInsight, upsertActivity, loadActivities,
  type BAActivityLog, type BACategory,
} from "./behaviouralActivation";

// In-memory store for secureLocal mock
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

function makeLog(overrides: Partial<BAActivityLog> & { id: string }): BAActivityLog {
  return {
    date: "2026-01-15",
    timestamp: "10:00",
    title: "Walk outside",
    category: "movement",
    status: "done",
    ...overrides,
  };
}

describe("categoryMeta", () => {
  it("returns metadata for a known category", () => {
    const m = categoryMeta("movement");
    expect(m.id).toBe("movement");
    expect(m.label).toBeTruthy();
    expect(m.basis).toBeTruthy();
  });
  it("falls back to first category for unknown id", () => {
    const m = categoryMeta("nonexistent" as BACategory);
    expect(m.id).toBe("movement");
  });
});

describe("computeInsight", () => {
  it("returns zeros for empty data", () => {
    const ins = computeInsight([]);
    expect(ins.done).toBe(0);
    expect(ins.planned).toBe(0);
    expect(ins.avgMastery).toBeNull();
    expect(ins.avgPleasure).toBeNull();
    expect(ins.topCategory).toBeNull();
  });

  it("counts done and planned", () => {
    const acts = [
      makeLog({ id: "a1", status: "done" }),
      makeLog({ id: "a2", status: "planned" }),
      makeLog({ id: "a3", status: "done" }),
    ];
    const ins = computeInsight(acts);
    expect(ins.done).toBe(2);
    expect(ins.planned).toBe(1);
  });

  it("computes avg mastery and pleasure for rated activities", () => {
    const acts = [
      makeLog({ id: "a1", status: "done", mastery: 8, pleasure: 6 }),
      makeLog({ id: "a2", status: "done", mastery: 4, pleasure: 10 }),
    ];
    const ins = computeInsight(acts);
    expect(ins.avgMastery).toBe(6);
    expect(ins.avgPleasure).toBe(8);
  });

  it("ignores unrated activities for averages", () => {
    const acts = [
      makeLog({ id: "a1", status: "done", mastery: 8, pleasure: 6 }),
      makeLog({ id: "a2", status: "done" }), // no ratings
    ];
    const ins = computeInsight(acts);
    expect(ins.avgMastery).toBe(8);
    expect(ins.avgPleasure).toBe(6);
  });

  it("requires >= 3 rated activities for topCategory", () => {
    const acts = [
      makeLog({ id: "a1", status: "done", category: "movement", mastery: 8, pleasure: 8 }),
      makeLog({ id: "a2", status: "done", category: "movement", mastery: 9, pleasure: 7 }),
    ];
    const ins = computeInsight(acts);
    expect(ins.topCategory).toBeNull(); // only 2 rated
  });

  it("computes topCategory when >= 3 rated activities exist", () => {
    const acts = [
      makeLog({ id: "a1", status: "done", category: "movement", mastery: 8, pleasure: 8 }),
      makeLog({ id: "a2", status: "done", category: "movement", mastery: 9, pleasure: 7 }),
      makeLog({ id: "a3", status: "done", category: "connection", mastery: 5, pleasure: 5 }),
      makeLog({ id: "a4", status: "done", category: "connection", mastery: 4, pleasure: 4 }),
    ];
    const ins = computeInsight(acts);
    expect(ins.topCategory).not.toBeNull();
    expect(ins.topCategory!.id).toBe("movement"); // (8+8+9+7)/2 = 16 vs (5+5+4+4)/2 = 9
    expect(ins.topCategory!.label).toBeTruthy();
  });
});

describe("upsertActivity", () => {
  it("inserts a new activity", () => {
    const entry = makeLog({ id: "new-1" });
    const result = upsertActivity(entry);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("new-1");
  });

  it("updates an existing activity by id", () => {
    upsertActivity(makeLog({ id: "x", status: "planned" }));
    const result = upsertActivity(makeLog({ id: "x", status: "done", mastery: 7 }));
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("done");
    expect(result[0].mastery).toBe(7);
  });

  it("persists to encrypted store", () => {
    upsertActivity(makeLog({ id: "persist-1" }));
    const loaded = loadActivities();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("persist-1");
  });
});

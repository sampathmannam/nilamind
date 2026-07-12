import { describe, it, expect, beforeEach, vi } from "vitest";

// Shared in-memory store — values.ts and valuesWork.ts both import "./secureLocal" (same relative
// path from src/services/), so this one mock backs both modules' storage inside this test file.
const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

// Non-sensitive one-shot migration flag lives in plain localStorage (mirrors emaPrefs.test.ts's pattern).
const ls = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
  setItem: (k: string, v: string) => { ls.set(k, String(v)); },
  removeItem: (k: string) => { ls.delete(k); },
});

import {
  loadValues,
  saveValues,
  loadActions,
  computeGaps,
  domainLabel,
  migrateValuesWorkToVlq,
  runValuesMigrationIfNeeded,
  type ValuesSnapshot,
} from "./values";
import {
  createValuesWork,
  saveValuesWork,
  setValueImportance,
  setValueAlignment,
  setCommittedAction,
  completeAction,
  loadValuesWork,
} from "./valuesWork";
import { isStepId } from "./valuesToAction";

beforeEach(() => {
  store.clear();
  ls.clear();
});

describe("values.ts core (previously untested)", () => {
  it("computeGaps clamps at zero and only surfaces domains at/above minImportance", () => {
    const snap: ValuesSnapshot = {
      date: "2026-01-01",
      timestamp: "t",
      ratings: {
        family: { importance: 8, consistency: 9 }, // consistency > importance → gap clamps to 0
        play: { importance: 3, consistency: 1 }, // below default minImportance(6) → excluded
      },
    };
    const gaps = computeGaps(snap);
    expect(gaps.find((g) => g.domainId === "family")!.gap).toBe(0);
    expect(gaps.find((g) => g.domainId === "play")).toBeUndefined();
  });

  it("domainLabel falls back to the raw id for an unknown domain", () => {
    expect(domainLabel("nonexistent")).toBe("nonexistent");
  });
});

describe("migrateValuesWorkToVlq — wave 3 Group B (valuesWork.ts -> values.ts, VLQ-cited tool)", () => {
  it("migrates the 6 exact-match domains", () => {
    let w = createValuesWork();
    w = setValueImportance(w, "family", 8);
    w = setValueAlignment(w, "family", 3);
    saveValuesWork(w);

    const result = migrateValuesWorkToVlq();
    expect(result.migratedRatings).toBe(1);

    const snap = loadValues();
    expect(snap!.ratings["family"]).toEqual({ importance: 8, consistency: 3 });
  });

  it("relabels spirituality -> meaning", () => {
    let w = createValuesWork();
    w = setValueImportance(w, "spirituality", 7);
    w = setValueAlignment(w, "spirituality", 4);
    saveValuesWork(w);

    migrateValuesWorkToVlq();

    const snap = loadValues();
    expect(snap!.ratings["meaning"]).toEqual({ importance: 7, consistency: 4 });
    expect(snap!.ratings["spirituality"]).toBeUndefined();
  });

  it("maps relationships -> close (best-effort single mapping, no split attempted)", () => {
    let w = createValuesWork();
    w = setValueImportance(w, "relationships", 9);
    w = setValueAlignment(w, "relationships", 2);
    saveValuesWork(w);

    migrateValuesWorkToVlq();

    expect(loadValues()!.ratings["close"]).toEqual({ importance: 9, consistency: 2 });
  });

  it("collects unmappable domains (self_care, autonomy, custom vw_*) into notMigrated instead of silently dropping them", () => {
    let w = createValuesWork();
    w = setValueImportance(w, "self_care", 6);
    w = setValueImportance(w, "autonomy", 5);
    w.push({
      id: "vw_12345",
      name: "My custom value",
      description: "",
      importance: 4,
      currentAlignment: 4,
      committedAction: "",
      completed: false,
      completedAt: null,
    });
    saveValuesWork(w);

    const result = migrateValuesWorkToVlq();
    expect(result.migratedRatings).toBe(0);
    const unmigratedIds = result.notMigrated.map((n) => n.domainId);
    expect(unmigratedIds).toContain("self_care");
    expect(unmigratedIds).toContain("autonomy");
    expect(unmigratedIds).toContain("vw_12345");
    expect(loadValues()).toBeNull(); // nothing mappable → no snapshot fabricated
  });

  it("does NOT clobber an existing values.ts rating for a domain the user already rated directly (merge, not overwrite)", () => {
    saveValues({ date: "2026-01-01", timestamp: "9:00", ratings: { family: { importance: 5, consistency: 5 } } });

    let w = createValuesWork();
    w = setValueImportance(w, "family", 10);
    w = setValueAlignment(w, "family", 0);
    saveValuesWork(w);

    const result = migrateValuesWorkToVlq();
    expect(result.migratedRatings).toBe(0);
    expect(result.notMigrated.some((n) => n.domainId === "family")).toBe(true);
    expect(loadValues()!.ratings["family"]).toEqual({ importance: 5, consistency: 5 }); // untouched
  });

  it("merges a migrated domain alongside an existing rating for a DIFFERENT domain, without touching the existing one", () => {
    saveValues({ date: "2026-01-01", timestamp: "9:00", ratings: { work: { importance: 7, consistency: 6 } } });

    let w = createValuesWork();
    w = setValueImportance(w, "health", 8);
    w = setValueAlignment(w, "health", 5);
    saveValuesWork(w);

    const result = migrateValuesWorkToVlq();
    expect(result.migratedRatings).toBe(1);
    const snap = loadValues()!;
    expect(snap.ratings["work"]).toEqual({ importance: 7, consistency: 6 }); // untouched
    expect(snap.ratings["health"]).toEqual({ importance: 8, consistency: 5 }); // newly merged in
  });

  it("migrates a committed action with a va_-prefixed id that round-trips through isStepId", () => {
    let w = createValuesWork();
    w = setCommittedAction(w, "health", "Go for a 20-minute walk");
    saveValuesWork(w);

    const result = migrateValuesWorkToVlq();
    expect(result.migratedActions).toBe(1);
    const actions = loadActions();
    expect(actions).toHaveLength(1);
    expect(isStepId(actions[0].id)).toBe(true);
    expect(actions[0].domainId).toBe("health");
    expect(actions[0].action).toBe("Go for a 20-minute walk");
    expect(actions[0].status).toBe("open");
  });

  it("marks a completed committed action as done with a doneDate", () => {
    let w = createValuesWork();
    w = setCommittedAction(w, "play", "watch a movie");
    w = completeAction(w, "play");
    saveValuesWork(w);

    migrateValuesWorkToVlq();

    const actions = loadActions();
    expect(actions[0].status).toBe("done");
    expect(actions[0].doneDate).toBeTruthy();
  });

  it("leaves nilamind_values_work completely intact (non-destructive — the source is never cleared)", () => {
    let w = createValuesWork();
    w = setValueImportance(w, "family", 8);
    saveValuesWork(w);

    migrateValuesWorkToVlq();

    const stillThere = loadValuesWork();
    expect(stillThere.find((d) => d.id === "family")!.importance).toBe(8);
  });

  it("skips domains with no data at all (untouched defaults)", () => {
    saveValuesWork(createValuesWork()); // all zeros, never touched by the user
    const result = migrateValuesWorkToVlq();
    expect(result.migratedRatings).toBe(0);
    expect(result.migratedActions).toBe(0);
    expect(result.notMigrated).toEqual([]);
    expect(loadValues()).toBeNull();
  });

  it("is a no-op when nilamind_values_work has never been saved", () => {
    const result = migrateValuesWorkToVlq();
    expect(result).toEqual({ migratedRatings: 0, migratedActions: 0, notMigrated: [] });
  });
});

describe("runValuesMigrationIfNeeded — one-time trigger", () => {
  it("runs the migration once and then no-ops on a second call", () => {
    let w = createValuesWork();
    w = setValueImportance(w, "family", 8);
    w = setValueAlignment(w, "family", 3);
    saveValuesWork(w);

    const first = runValuesMigrationIfNeeded();
    expect(first).not.toBeNull();
    expect(first!.migratedRatings).toBe(1);

    const second = runValuesMigrationIfNeeded();
    expect(second).toBeNull(); // already migrated — flag set, no re-run
  });

  it("does not re-migrate on a fresh call after the flag is set, even if new valuesWork data appears later", () => {
    runValuesMigrationIfNeeded(); // nothing to migrate, but sets the flag

    let w = createValuesWork();
    w = setValueImportance(w, "family", 9);
    saveValuesWork(w);

    expect(runValuesMigrationIfNeeded()).toBeNull();
    expect(loadValues()).toBeNull(); // never migrated, by design (one-shot)
  });
});

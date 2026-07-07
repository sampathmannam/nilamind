import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import {
  VALUE_DOMAINS,
  createValuesWork,
  loadValuesWork,
  saveValuesWork,
  setValueImportance,
  setValueAlignment,
  setCommittedAction,
  completeAction,
  resetActions,
  topValues,
  alignmentGap,
  weeklyAlignmentScore,
} from "./valuesWork";

describe("valuesWork", () => {
  beforeEach(() => { store.clear(); });

  it("VALUE_DOMAINS has 10 domains", () => {
    expect(VALUE_DOMAINS).toHaveLength(10);
  });

  it("createValuesWork initializes all 10 domains with zero values", () => {
    const w = createValuesWork();
    expect(w).toHaveLength(10);
    expect(w[0].importance).toBe(0);
    expect(w[0].currentAlignment).toBe(0);
    expect(w[0].committedAction).toBe("");
    expect(w[0].completed).toBe(false);
  });

  it("save and load round-trip", () => {
    const w = createValuesWork();
    w[0].importance = 8;
    w[1].currentAlignment = 5;
    saveValuesWork(w);
    const loaded = loadValuesWork();
    expect(loaded[0].importance).toBe(8);
    expect(loaded[1].currentAlignment).toBe(5);
  });

  it("loadValuesWork returns empty when nothing saved", () => {
    expect(loadValuesWork()).toEqual([]);
  });

  it("setValueImportance clamps 0-10", () => {
    let w = createValuesWork();
    w = setValueImportance(w, "relationships", 12);
    expect(w[0].importance).toBe(10);
    w = setValueImportance(w, "relationships", -1);
    expect(w[0].importance).toBe(0);
  });

  it("setCommittedAction sets action text", () => {
    let w = createValuesWork();
    w = setCommittedAction(w, "health", "Go for a 20-minute walk");
    const health = w.find((d) => d.id === "health")!;
    expect(health.committedAction).toBe("Go for a 20-minute walk");
  });

  it("completeAction marks done with timestamp", () => {
    let w = createValuesWork();
    w = completeAction(w, "family");
    expect(w.find((d) => d.id === "family")!.completed).toBe(true);
    expect(w.find((d) => d.id === "family")!.completedAt).toBeTruthy();
  });

  it("resetActions clears all completions", () => {
    let w = createValuesWork();
    w = setCommittedAction(w, "play", "watch a movie");
    w = completeAction(w, "play");
    w = resetActions(w);
    expect(w.find((d) => d.id === "play")!.completed).toBe(false);
    expect(w.find((d) => d.id === "play")!.committedAction).toBe("");
  });

  it("topValues returns domains sorted by importance", () => {
    let w = createValuesWork();
    w = setValueImportance(w, "health", 9);
    w = setValueImportance(w, "relationships", 7);
    w = setValueImportance(w, "work", 5);
    const top = topValues(w, 2);
    expect(top).toHaveLength(2);
    expect(top[0].id).toBe("health");
  });

  it("alignmentGap sorts by largest gap", () => {
    let w = createValuesWork();
    w = setValueImportance(w, "health", 9);
    w = setValueAlignment(w, "health", 3);
    w = setValueImportance(w, "work", 8);
    w = setValueAlignment(w, "work", 7);
    const gaps = alignmentGap(w);
    expect(gaps[0].domain.id).toBe("health");
    expect(gaps[0].gap).toBe(6);
  });

  it("weeklyAlignmentScore returns average alignment", () => {
    let w = createValuesWork();
    w = setValueImportance(w, "health", 5);
    w = setValueAlignment(w, "health", 8);
    w = setValueImportance(w, "relationships", 7);
    w = setValueAlignment(w, "relationships", 6);
    expect(weeklyAlignmentScore(w)).toBe(7);
  });

  it("weeklyAlignmentScore returns null when no domains rated", () => {
    expect(weeklyAlignmentScore(createValuesWork())).toBeNull();
  });
});

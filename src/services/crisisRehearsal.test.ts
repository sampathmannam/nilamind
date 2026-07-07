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
  DEFAULT_SCENARIOS,
  loadRehearsalLogs,
  saveRehearsalLog,
  rehearsalCompletionRate,
} from "./crisisRehearsal";

describe("crisisRehearsal", () => {
  beforeEach(() => { store.clear(); });

  it("DEFAULT_SCENARIOS have 3 scenarios with steps", () => {
    expect(DEFAULT_SCENARIOS).toHaveLength(3);
    for (const s of DEFAULT_SCENARIOS) {
      expect(s.steps.length).toBeGreaterThan(0);
      expect(s.title).toBeTruthy();
    }
  });

  it("loadRehearsalLogs returns empty when nothing saved", () => {
    expect(loadRehearsalLogs()).toEqual([]);
  });

  it("saveRehearsalLog and loadRehearsalLogs round-trip", () => {
    saveRehearsalLog({ scenarioId: "panic_attack", completedAt: new Date().toISOString(), completedSteps: 7, totalSteps: 7 });
    saveRehearsalLog({ scenarioId: "suicidal_thoughts", completedAt: new Date().toISOString(), completedSteps: 4, totalSteps: 7 });
    const logs = loadRehearsalLogs();
    expect(logs).toHaveLength(2);
  });

  it("rehearsalCompletionRate computes average", () => {
    saveRehearsalLog({ scenarioId: "test", completedAt: "", completedSteps: 7, totalSteps: 7 });
    saveRehearsalLog({ scenarioId: "test", completedAt: "", completedSteps: 3, totalSteps: 7 });
    expect(rehearsalCompletionRate(loadRehearsalLogs())).toBe(71);
  });

  it("rehearsalCompletionRate returns 0 for empty logs", () => {
    expect(rehearsalCompletionRate([])).toBe(0);
  });
});

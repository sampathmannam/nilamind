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
  createEmptyPlan,
  loadRelapsePlan,
  saveRelapsePlan,
  currentPhase,
  phaseLabel,
  signalFields,
  actionFields,
  EMPTY_SIGNALS,
  EMPTY_ACTIONS,
} from "./relapsePlan";

describe("relapsePlan", () => {
  beforeEach(() => { store.clear(); });

  it("createEmptyPlan has three phases with empty signals and actions", () => {
    const p = createEmptyPlan();
    expect(p.green.signals.thoughts).toBe("");
    expect(p.green.actions.selfCare).toEqual([]);
    expect(p.orange.signals.behaviors).toBe("");
    expect(p.red.actions.crisisHelp).toEqual([]);
    expect(p.id).toMatch(/^rp_/);
  });

  it("loadRelapsePlan returns null when nothing saved", () => {
    expect(loadRelapsePlan()).toBeNull();
  });

  it("saveRelapsePlan and loadRelapsePlan round-trip", () => {
    const p = createEmptyPlan();
    p.green.signals.thoughts = "I feel calm and focused";
    saveRelapsePlan(p);
    const loaded = loadRelapsePlan();
    expect(loaded?.green.signals.thoughts).toBe("I feel calm and focused");
  });

  it("currentPhase returns green by default", () => {
    expect(currentPhase(null)).toBe("green");
    expect(currentPhase(createEmptyPlan())).toBe("green");
  });

  it("returns red when red signals are filled", () => {
    const p = createEmptyPlan();
    p.red.signals.thoughts = "I want to die";
    expect(currentPhase(p)).toBe("red");
  });

  it("returns orange when orange signals are filled", () => {
    const p = createEmptyPlan();
    p.orange.signals.thoughts = "I feel irritable";
    expect(currentPhase(p)).toBe("orange");
  });

  it("phaseLabel returns descriptive text", () => {
    expect(phaseLabel("green")).toContain("Green");
    expect(phaseLabel("orange")).toContain("Orange");
    expect(phaseLabel("red")).toContain("Red");
  });

  it("signalFields returns 4 signal categories", () => {
    expect(signalFields()).toHaveLength(4);
    expect(signalFields()[0].key).toBe("thoughts");
  });

  it("actionFields returns 4 action categories with real prompts, not raw keys", () => {
    const fields = actionFields();
    expect(fields).toHaveLength(4);
    expect(fields.map((f) => f.key)).toEqual(["selfCare", "copingSkills", "reachOut", "crisisHelp"]);
    for (const f of fields) {
      expect(f.placeholder).not.toBe(`${f.key}...`);
      expect(f.placeholder.length).toBeGreaterThan(10);
    }
  });

  it("EMPTY_SIGNALS and EMPTY_ACTIONS are consistent", () => {
    expect(EMPTY_SIGNALS.thoughts).toBe("");
    expect(EMPTY_ACTIONS.selfCare).toEqual([]);
  });
});

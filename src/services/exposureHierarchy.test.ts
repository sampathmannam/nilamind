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
  createHierarchy,
  addStep,
  removeStep,
  completeStep,
  loadHierarchy,
  saveHierarchy,
  completionRate,
  averageSudReduction,
  nextStep,
  inhibitoryLearningPrompts,
} from "./exposureHierarchy";

describe("exposureHierarchy", () => {
  beforeEach(() => { store.clear(); });

  it("createHierarchy initializes with empty steps", () => {
    const h = createHierarchy("Social anxiety");
    expect(h.id).toMatch(/^eh_/);
    expect(h.title).toBe("Social anxiety");
    expect(h.steps).toEqual([]);
  });

  it("addStep sorts steps by SUDS ascending", () => {
    let h = createHierarchy("Heights");
    h = addStep(h, "Look at a photo of a tall building", 2);
    h = addStep(h, "Stand on a balcony", 8);
    h = addStep(h, "Look out a 2nd floor window", 4);
    expect(h.steps[0].suds).toBe(2);
    expect(h.steps[1].suds).toBe(4);
    expect(h.steps[2].suds).toBe(8);
  });

  it("addStep clamps SUDS 0-10", () => {
    let h = createHierarchy("Test");
    h = addStep(h, "Too high", 15);
    h = addStep(h, "Negative", -5);
    const sudsValues = h.steps.map((s) => s.suds).sort((a, b) => a - b);
    expect(sudsValues).toEqual([0, 10]);
  });

  it("removeStep filters correctly", () => {
    let h = createHierarchy("Test");
    h = addStep(h, "Step 1", 3);
    h = addStep(h, "Step 2", 5);
    const before = h.steps.length;
    expect(before).toBe(2);
    h = removeStep(h, h.steps[0]!.id);
    expect(h.steps.length).toBe(1);
  });

  it("full workflow: add, complete, rate, next-step", () => {
    let h = createHierarchy("Workflow");
    h = addStep(h, "A", 1); h = addStep(h, "B", 3); h = addStep(h, "C", 5);
    expect(h.steps.length).toBe(3);

    h = completeStep(h, h.steps[0]!.id, 1, 0, "done A");
    expect(completionRate(h)).toBe(33);

    h = completeStep(h, h.steps[1]!.id, 3, 1, "done B");
    expect(completionRate(h)).toBe(67);
    expect(averageSudReduction(h)).toBe(1.5);

    h = completeStep(h, h.steps[2]!.id, 5, 2, "done C");
    expect(completionRate(h)).toBe(100);
    expect(nextStep(h)).toBeNull();
  });

  it("inhibitoryLearningPrompts returns 5 prompts", () => {
    expect(inhibitoryLearningPrompts()).toHaveLength(5);
  });

  // §9 defense-in-depth: a free-text field is a crisis-disclosure surface. Even though the screen gates
  // the input, the data layer must NEVER persist a crisis disclosure as an exposure "step" — that would
  // both miss the moment AND leave the disclosure sitting in the ladder. The screen surfaces help instead.
  it("§9: addStep refuses a crisis disclosure — it never lands in the ladder", () => {
    let h = createHierarchy("Social anxiety");
    h = addStep(h, "i want to kill myself", 5);
    expect(h.steps).toHaveLength(0);
  });

  // Paired benign control — a real exposure step (which can name a scary situation) must NOT false-fire.
  it("§9: a genuine exposure step is still added (no false positive)", () => {
    let h = createHierarchy("Social anxiety");
    h = addStep(h, "Make a phone call to a stranger", 5);
    h = addStep(h, "Ask someone for directions", 3);
    expect(h.steps).toHaveLength(2);
  });
});

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
  createSession,
  addSolution,
  setProsCons,
  chooseSolution,
  setActionPlan,
  completeSession,
  loadSessions,
  saveSession,
  activeSessions,
  solveRate,
} from "./problemSolving";

describe("problemSolving", () => {
  beforeEach(() => { store.clear(); });

  it("createSession initializes with problem text", () => {
    const s = createSession("I'm struggling to sleep");
    expect(s.id).toMatch(/^pst_/);
    expect(s.problem).toBe("I'm struggling to sleep");
    expect(s.step).toBe("define");
    expect(s.solutions).toEqual([]);
  });

  it("full PST lifecycle: define -> brainstorm -> evaluate -> plan -> review", () => {
    let s = createSession("Work stress");

    s = addSolution(s, "Talk to my manager");
    s = addSolution(s, "Start looking for new jobs");
    s = addSolution(s, "Reduce my hours temporarily");
    expect(s.solutions).toHaveLength(3);

    s = setProsCons(s, s.solutions[0].id, ["Direct", "Quick"], ["Anxiety-provoking"]);
    s = chooseSolution(s, s.solutions[0].id);
    expect(s.solutions[0].chosen).toBe(true);

    s = setActionPlan(s, ["Draft email", "Schedule 1:1", "Rehearse what to say"]);
    expect(s.actionPlan).toHaveLength(3);

    s = completeSession(s, false, "Partial improvement — manager was understanding");
    expect(s.completed).toBe(true);
    expect(s.solved).toBe(false);
    expect(s.learning).toContain("manager");
  });

  it("save and load sessions round-trip", () => {
    const s = createSession("Test problem");
    saveSession(s);
    const loaded = loadSessions();
    expect(loaded[0].problem).toBe("Test problem");
  });

  it("activeSessions filters out completed", () => {
    const s1 = createSession("A");
    s1.completed = true;
    const s2 = createSession("B");
    saveSession(s1);
    saveSession(s2);
    const active = activeSessions();
    expect(active).toHaveLength(1);
    expect(active[0].problem).toBe("B");
  });

  it("solveRate computes percentage of solved", () => {
    const s1 = createSession("A"); s1.completed = true; s1.solved = true;
    const s2 = createSession("B"); s2.completed = true; s2.solved = false;
    const s3 = createSession("C");
    saveSession(s1); saveSession(s2); saveSession(s3);
    expect(solveRate(loadSessions())).toBe(50);
  });

  // Clinical research upgrades wave 2 (2026-07-12), Task C — if-then implementation intentions + a barrier
  // plan on PST action plans, per Gollwitzer & Sheeran (2006), Adv Exp Soc Psychol (d=0.65 general goal
  // attainment, d+=0.99 in mental-health samples) — the cheapest evidence-backed win available.
  describe("setActionPlan — implementation intentions + barrier plan", () => {
    it("accepts an optional if-then implementation intention and barrier plan", () => {
      let s = createSession("Work stress");
      s = setActionPlan(s, ["Draft email"], {
        implementationIntention: "If it's Monday 9am, then I will draft the email.",
        barrierPlan: "If I freeze up, I'll ask my sister to read it over first.",
      });
      expect(s.implementationIntention).toBe("If it's Monday 9am, then I will draft the email.");
      expect(s.barrierPlan).toBe("If I freeze up, I'll ask my sister to read it over first.");
      expect(s.actionPlan).toEqual(["Draft email"]);
    });

    it("works without the optional fields (backward compatible)", () => {
      let s = createSession("Work stress");
      s = setActionPlan(s, ["Draft email"]);
      expect(s.implementationIntention).toBeUndefined();
      expect(s.barrierPlan).toBeUndefined();
    });

    it("round-trips implementation intention + barrier plan through save/load", () => {
      let s = createSession("Test problem");
      s = setActionPlan(s, ["Step one"], {
        implementationIntention: "If I sit at my desk, then I will open the doc.",
        barrierPlan: "If I get distracted, I'll set a 5-minute timer.",
      });
      saveSession(s);
      const loaded = loadSessions();
      expect(loaded[0].implementationIntention).toContain("desk");
      expect(loaded[0].barrierPlan).toContain("timer");
    });
  });
});

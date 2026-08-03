import { describe, it, expect } from "vitest";
import { BEHAVIORAL_EXPERIMENTS } from "./protocolBehavioralExperiments";

describe("BEHAVIORAL_EXPERIMENTS protocol", () => {
  it('has id "behavioral-experiments"', () => {
    expect(BEHAVIORAL_EXPERIMENTS.id).toBe("behavioral-experiments");
  });

  it("has forConcerns array with >10 items", () => {
    expect(BEHAVIORAL_EXPERIMENTS.forConcerns.length).toBeGreaterThan(10);
  });

  it("has exactly 5 steps", () => {
    expect(BEHAVIORAL_EXPERIMENTS.steps).toHaveLength(5);
  });

  it("step ids are be-1 through be-5 in order", () => {
    const ids = BEHAVIORAL_EXPERIMENTS.steps.map((s) => s.id);
    expect(ids).toEqual(["be-1", "be-2", "be-3", "be-4", "be-5"]);
  });

  it("step kinds are psychoed, reflect, plan, exercise, reflect", () => {
    const kinds = BEHAVIORAL_EXPERIMENTS.steps.map((s) => s.kind);
    expect(kinds).toEqual(["psychoed", "reflect", "plan", "exercise", "reflect"]);
  });

  it("every step has a non-empty title and prompt", () => {
    for (const s of BEHAVIORAL_EXPERIMENTS.steps) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.prompt.length).toBeGreaterThan(10);
    }
  });

  it("has a valid basis referencing research", () => {
    expect(BEHAVIORAL_EXPERIMENTS.basis.length).toBeGreaterThan(20);
    expect(BEHAVIORAL_EXPERIMENTS.basis).toContain("Bennett-Levy");
  });
});

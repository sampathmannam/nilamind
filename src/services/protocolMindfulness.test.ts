import { describe, it, expect } from "vitest";
import { MINDFULNESS_PRACTICE } from "./protocolMindfulness";

describe("MINDFULNESS_PRACTICE protocol", () => {
  it('has id "mindfulness-practice"', () => {
    expect(MINDFULNESS_PRACTICE.id).toBe("mindfulness-practice");
  });

  it("has forConcerns array with >10 items", () => {
    expect(MINDFULNESS_PRACTICE.forConcerns.length).toBeGreaterThan(10);
  });

  it("has exactly 5 steps", () => {
    expect(MINDFULNESS_PRACTICE.steps).toHaveLength(5);
  });

  it("step kinds are psychoed, exercise, exercise, reflect, reflect", () => {
    const kinds = MINDFULNESS_PRACTICE.steps.map((s) => s.kind);
    expect(kinds).toEqual(["psychoed", "exercise", "exercise", "reflect", "reflect"]);
  });

  it("every step has a valid id, title, and prompt", () => {
    for (const s of MINDFULNESS_PRACTICE.steps) {
      expect(s.id).toBeTruthy();
      expect(s.id.startsWith("mfp-")).toBe(true);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.prompt.length).toBeGreaterThan(10);
    }
  });

  it("has a valid basis referencing MBCT research", () => {
    expect(MINDFULNESS_PRACTICE.basis.length).toBeGreaterThan(20);
    expect(MINDFULNESS_PRACTICE.basis).toContain("Kuyken");
  });

  it("has unique step ids", () => {
    const ids = MINDFULNESS_PRACTICE.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

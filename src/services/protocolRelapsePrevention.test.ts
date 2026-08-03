import { describe, it, expect } from "vitest";
import { RELAPSE_PREVENTION } from "./protocolRelapsePrevention";

describe("RELAPSE_PREVENTION protocol", () => {
  it('has id "relapse-prevention"', () => {
    expect(RELAPSE_PREVENTION.id).toBe("relapse-prevention");
  });

  it("has forConcerns array with >10 items", () => {
    expect(RELAPSE_PREVENTION.forConcerns.length).toBeGreaterThan(10);
  });

  it("has exactly 7 steps", () => {
    expect(RELAPSE_PREVENTION.steps).toHaveLength(7);
  });

  it("step kinds are psychoed, reflect, reflect, plan, plan, plan, reflect", () => {
    const kinds = RELAPSE_PREVENTION.steps.map((s) => s.kind);
    expect(kinds).toEqual([
      "psychoed",
      "reflect",
      "reflect",
      "plan",
      "plan",
      "plan",
      "reflect",
    ]);
  });

  it("step ids are rp-1 through rp-7 in order", () => {
    const ids = RELAPSE_PREVENTION.steps.map((s) => s.id);
    expect(ids).toEqual(["rp-1", "rp-2", "rp-3", "rp-4", "rp-5", "rp-6", "rp-7"]);
  });

  it("every step has a valid title and prompt", () => {
    for (const s of RELAPSE_PREVENTION.steps) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.prompt.length).toBeGreaterThan(10);
    }
  });

  it("has a valid basis referencing Marlatt & Gordon", () => {
    expect(RELAPSE_PREVENTION.basis.length).toBeGreaterThan(20);
    expect(RELAPSE_PREVENTION.basis).toContain("Marlatt");
  });

  it("has unique step ids", () => {
    const ids = RELAPSE_PREVENTION.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

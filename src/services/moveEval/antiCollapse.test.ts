import { describe, it, expect } from "vitest";
import { antiCollapseReport } from "./antiCollapse";

describe("antiCollapseReport", () => {
  it("returns zeros (no NaN) for an empty set", () => {
    const r = antiCollapseReport([]);
    expect(r.questionEndRatio).toBe(0);
    expect(r.repetitionRate).toBe(0);
    expect(Object.values(r.lengthHist).every((v) => Number.isFinite(v))).toBe(true);
  });

  it("flags near-total repetition when every reply is identical", () => {
    const same = Array.from({ length: 5 }, () => "I hear you. What's the hardest part?");
    const r = antiCollapseReport(same);
    expect(r.repetitionRate).toBeGreaterThan(0.9);
  });

  it("reports low repetition for a varied set", () => {
    const varied = [
      "That's a real loss.",
      "Your mind keeps running the tape.",
      "Panic peaks and passes.",
      "Glad you told me that.",
    ];
    expect(antiCollapseReport(varied).repetitionRate).toBeLessThan(0.3);
  });

  it("computes the question-ending ratio", () => {
    const replies = ["A statement.", "A question?", "Another statement.", "Another question?"];
    expect(antiCollapseReport(replies).questionEndRatio).toBeCloseTo(0.5, 5);
  });

  it("buckets reply length by sentence count (1/2/3/4+)", () => {
    const replies = ["One.", "One. Two.", "One. Two. Three.", "One. Two. Three. Four."];
    const h = antiCollapseReport(replies).lengthHist;
    expect(h["1"]).toBe(1);
    expect(h["2"]).toBe(1);
    expect(h["3"]).toBe(1);
    expect(h["4+"]).toBe(1);
  });
});

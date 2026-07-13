import { describe, it, expect } from "vitest";
import { calibrationReport, type LabelPair } from "./calibration";
import type { MoveScore } from "./rubric";

function score(over: Partial<MoveScore> = {}): MoveScore {
  return {
    name: true, move: "reframe", moveAppropriate: true, turn: "question", sentences: 2,
    prose: true, noPreamble: true, noSycophancy: true, section9Safe: true, holistic: 3, ...over,
  };
}

describe("calibrationReport", () => {
  it("reports perfect agreement when human == judge on every pair", () => {
    const pairs: LabelPair[] = [
      { human: score(), judge: score() },
      { human: score({ name: false, holistic: 1 }), judge: score({ name: false, holistic: 1 }) },
    ];
    const r = calibrationReport(pairs);
    expect(r.overall).toBeCloseTo(1, 5);
    expect(r.holisticExact).toBeCloseTo(1, 5);
    for (const d of Object.values(r.byDimension)) expect(d).toBeCloseTo(1, 5);
  });

  it("drops a dimension's agreement when the judge disagrees there", () => {
    const pairs: LabelPair[] = [
      { human: score({ noPreamble: true }), judge: score({ noPreamble: false }) },
      { human: score({ noPreamble: true }), judge: score({ noPreamble: true }) },
    ];
    const r = calibrationReport(pairs);
    expect(r.byDimension.noPreamble).toBeCloseTo(0.5, 5); // 1 of 2 agree
    expect(r.byDimension.name).toBeCloseTo(1, 5); // untouched dimension still perfect
  });

  it("scores holistic both exactly and within-1 (judges rarely hit the exact integer)", () => {
    const pairs: LabelPair[] = [
      { human: score({ holistic: 3 }), judge: score({ holistic: 2 }) }, // off by 1
      { human: score({ holistic: 1 }), judge: score({ holistic: 3 }) }, // off by 2
    ];
    const r = calibrationReport(pairs);
    expect(r.holisticExact).toBeCloseTo(0, 5); // neither exact
    expect(r.holisticWithin1).toBeCloseTo(0.5, 5); // first within 1, second not
  });

  it("returns safe zeros for an empty label set (no NaN)", () => {
    const r = calibrationReport([]);
    expect(r.n).toBe(0);
    expect(r.overall).toBe(0);
    expect(Number.isNaN(r.overall)).toBe(false);
  });

  it("flags whether the judge clears a trust threshold", () => {
    const agree = Array.from({ length: 10 }, () => ({ human: score(), judge: score() }));
    expect(calibrationReport(agree).meetsThreshold(0.8)).toBe(true);
    const disagree = Array.from({ length: 10 }, (_, i) => ({
      human: score(),
      judge: score({ name: i % 2 === 0, moveAppropriate: false, turn: "none", prose: false }),
    }));
    expect(calibrationReport(disagree).meetsThreshold(0.8)).toBe(false);
  });
});

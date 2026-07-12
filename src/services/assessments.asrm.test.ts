import { describe, it, expect } from "vitest";
import { ASRM, INSTRUMENTS, scoreAssessment } from "./assessments";

// ASRM (Altman Self-Rating Mania Scale) — the app's mania/(hypo)mania screen. Verbatim items and
// anchors, 0–4 per item, sum 0–20, cut-point ≥6. See assessments.ts header for the citation.

describe("ASRM instrument definition", () => {
  it("is registered and has 5 items, 0–4 per item, max 20", () => {
    expect(INSTRUMENTS["ASRM"]).toBe(ASRM);
    expect(ASRM.items).toHaveLength(5);
    expect(ASRM.maxScore).toBe(20);
    expect(ASRM.responseOptions).toHaveLength(5);
  });

  it("overrides only the sleep item (index 2) with its own anchors", () => {
    expect(ASRM.itemResponseOptions).toBeDefined();
    expect(ASRM.itemResponseOptions![2]).toEqual([
      "No change", "Slightly less than usual", "Markedly less than usual", "Much less than usual", "Enormously less than usual",
    ]);
    expect(ASRM.itemResponseOptions![0]).toBe(ASRM.responseOptions);
    expect(ASRM.itemResponseOptions![3]).toBe(ASRM.responseOptions);
  });

  it("has no safety item (mania screen is not a crisis-trigger instrument)", () => {
    expect(ASRM.safetyItemIndex).toBeUndefined();
  });
});

describe("scoreAssessment for ASRM", () => {
  it("scores all-zero as 0 / Below screen, with no safety flag", () => {
    const r = scoreAssessment("ASRM", [0, 0, 0, 0, 0]);
    expect(r.total).toBe(0);
    expect(r.band.label).toBe("Below screen");
    expect(r.safetyFlag).toBe(false);
  });

  it("flags the cut-point exactly at 6 as Possible hypomania", () => {
    const r = scoreAssessment("ASRM", [1, 1, 1, 1, 2]); // 6
    expect(r.total).toBe(6);
    expect(r.band.label).toBe("Possible hypomania");
  });

  it("scores a maximum 20 as Likely mania", () => {
    const r = scoreAssessment("ASRM", [4, 4, 4, 4, 4]);
    expect(r.total).toBe(20);
    expect(r.band.label).toBe("Likely mania");
  });

  it("never sets a safety flag for ASRM (no safetyItemIndex)", () => {
    expect(scoreAssessment("ASRM", [4, 4, 4, 4, 4]).safetyFlag).toBe(false);
  });

  it("rejects the wrong number of responses", () => {
    expect(() => scoreAssessment("ASRM", [0, 0, 0, 0])).toThrow();
    expect(() => scoreAssessment("ASRM", [0, 0, 0, 0, 0, 0])).toThrow();
  });

  it("rejects out-of-range responses", () => {
    expect(() => scoreAssessment("ASRM", [5, 0, 0, 0, 0])).toThrow();
  });
});

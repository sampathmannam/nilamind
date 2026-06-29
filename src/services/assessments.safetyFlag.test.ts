import { describe, it, expect } from "vitest";
import { scoreAssessment } from "./assessments";

// The PHQ-9 result banner in AssessmentScreen renders only when ScoredResult.safetyFlag is true,
// and that banner's button is the entry point to crisis tools. This locks the load-bearing rule:
// safetyFlag is true iff PHQ-9 item 9 (0-based index 8, self-harm ideation) is endorsed at any
// level > 0 — and is never set for instruments without a safetyItemIndex.
describe("scoreAssessment safetyFlag (PHQ-9 item-9 suicide-safety routing)", () => {
  // 9 responses, all zero -> a valid "minimal" PHQ-9 with item 9 not endorsed.
  const phq9AllZero = [0, 0, 0, 0, 0, 0, 0, 0, 0];

  it("sets safetyFlag=true when PHQ-9 item 9 is endorsed at the lowest level (1)", () => {
    const responses = [...phq9AllZero];
    responses[8] = 1; // item 9 = "Several days"
    expect(scoreAssessment("PHQ-9", responses).safetyFlag).toBe(true);
  });

  it("sets safetyFlag=true when PHQ-9 item 9 is endorsed at the highest level (3)", () => {
    const responses = [...phq9AllZero];
    responses[8] = 3; // item 9 = "Nearly every day"
    expect(scoreAssessment("PHQ-9", responses).safetyFlag).toBe(true);
  });

  it("sets safetyFlag=true even on an otherwise minimal PHQ-9 (low total, item 9 endorsed)", () => {
    const responses = [...phq9AllZero];
    responses[8] = 2; // total = 2 (Minimal band) but item 9 > 0
    const scored = scoreAssessment("PHQ-9", responses);
    expect(scored.total).toBe(2);
    expect(scored.band.label).toBe("Minimal");
    expect(scored.safetyFlag).toBe(true);
  });

  it("keeps safetyFlag=false when PHQ-9 item 9 is exactly 0, even with a high total", () => {
    // Everything else maxed, item 9 = 0 -> high score, NO safety flag.
    const responses = [3, 3, 3, 3, 3, 3, 3, 3, 0];
    const scored = scoreAssessment("PHQ-9", responses);
    expect(scored.total).toBe(24);
    expect(scored.safetyFlag).toBe(false);
  });

  it("never sets safetyFlag for GAD-7 (no safetyItemIndex)", () => {
    expect(scoreAssessment("GAD-7", [3, 3, 3, 3, 3, 3, 3]).safetyFlag).toBe(false);
  });

  it("never sets safetyFlag for WHO-5 / PSS-4 / PHQ-2 (no safetyItemIndex)", () => {
    expect(scoreAssessment("WHO-5", [0, 0, 0, 0, 0]).safetyFlag).toBe(false);
    expect(scoreAssessment("PSS-4", [4, 4, 4, 4]).safetyFlag).toBe(false);
    expect(scoreAssessment("PHQ-2", [3, 3]).safetyFlag).toBe(false);
  });
});

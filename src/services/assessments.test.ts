import { describe, it, expect } from "vitest";
import { isSameRecallWindowRetake, RECALL_WINDOW_GUARD_DAYS, classifyChange } from "./assessments";
import type { AssessmentEntry } from "./assessments";

// PHQ-9/GAD-7 ask about the last 2 weeks (Kroenke et al., 2001; Spitzer et al., 2006), so a retake
// taken very soon after the last one is scoring mostly-the-same recall window, not fresh signal.
// isSameRecallWindowRetake is a pure, non-blocking guard the UI uses to show a soft heads-up —
// it must never prevent the user from retaking (see AssessmentScreen.tsx).
const entryDaysAgo = (days: number): AssessmentEntry => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return {
    id: "as_x",
    date: d.toISOString().split("T")[0],
    timestamp: "10:00:00",
    instrument: "PHQ-9",
    responses: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    total: 0,
    severity: "Minimal",
    safetyFlag: false,
  };
};

describe("isSameRecallWindowRetake", () => {
  it("is false when there is no prior entry", () => {
    expect(isSameRecallWindowRetake(null)).toBe(false);
  });

  it("is true for an entry taken today", () => {
    expect(isSameRecallWindowRetake(entryDaysAgo(0))).toBe(true);
  });

  it(`is true up to ${RECALL_WINDOW_GUARD_DAYS - 1} days after the last entry`, () => {
    expect(isSameRecallWindowRetake(entryDaysAgo(RECALL_WINDOW_GUARD_DAYS - 1))).toBe(true);
  });

  it(`is false once ${RECALL_WINDOW_GUARD_DAYS} or more days have passed`, () => {
    expect(isSameRecallWindowRetake(entryDaysAgo(RECALL_WINDOW_GUARD_DAYS))).toBe(false);
    expect(isSameRecallWindowRetake(entryDaysAgo(RECALL_WINDOW_GUARD_DAYS + 10))).toBe(false);
  });
});

// classifyChange (2026-07-12 Wave 3, Group G): reliable-change/MCID banding — distinguishes a real
// shift from test-retest noise. PHQ-9 MCID≈5 (Löwe et al., 2004, Medical Care) and GAD-7 MCID≈4
// (Toussaint et al., 2020, J. Affective Disorders) are cited figures (confidence:"cited"). WHO-5 has
// no established MCID in the app's citation set — the synthesis doc says to treat it "cautiously" —
// so its threshold is an engineering default and callers get confidence:"heuristic", never "cited".
describe("classifyChange", () => {
  it("a >MCID improvement on PHQ-9 (lower is better) classifies as reliable improvement", () => {
    // previous 20 -> current 10: a 10-point drop, well past the 5-point MCID.
    const c = classifyChange("PHQ-9", 20, 10);
    expect(c).not.toBeNull();
    expect(c!.direction).toBe("improvement");
    expect(c!.delta).toBe(-10);
    expect(c!.threshold).toBe(5);
    expect(c!.confidence).toBe("cited");
  });

  it("a change within the PHQ-9 MCID band classifies as no reliable change (not noise-as-signal)", () => {
    // previous 12 -> current 10: a 2-point drop, inside the 5-point MCID band.
    const c = classifyChange("PHQ-9", 12, 10);
    expect(c!.direction).toBe("no_reliable_change");
    expect(c!.delta).toBe(-2);
  });

  it("a >MCID worsening on PHQ-9 classifies as reliable deterioration", () => {
    // previous 4 -> current 12: an 8-point rise, well past the 5-point MCID.
    const c = classifyChange("PHQ-9", 4, 12);
    expect(c!.direction).toBe("deterioration");
    expect(c!.delta).toBe(8);
  });

  it("uses the GAD-7 MCID (~4) — a 6-point rise is reliable deterioration, a 2-point rise is not", () => {
    expect(classifyChange("GAD-7", 6, 12)!.direction).toBe("deterioration");
    expect(classifyChange("GAD-7", 6, 8)!.direction).toBe("no_reliable_change");
    expect(classifyChange("GAD-7", 6, 12)!.threshold).toBe(4);
    expect(classifyChange("GAD-7", 6, 12)!.confidence).toBe("cited");
  });

  it("WHO-5 (higher is better) classifies improvement/deterioration with confidence:'heuristic', never 'cited'", () => {
    const improved = classifyChange("WHO-5", 30, 60); // +30, well past any reasonable threshold
    expect(improved!.direction).toBe("improvement");
    expect(improved!.confidence).toBe("heuristic");

    const worsened = classifyChange("WHO-5", 60, 30); // -30
    expect(worsened!.direction).toBe("deterioration");
    expect(worsened!.confidence).toBe("heuristic");
  });

  it("returns null for instruments with no established reliable-change threshold (PHQ-2, PSS-4) rather than inventing one", () => {
    expect(classifyChange("PHQ-2", 0, 6)).toBeNull();
    expect(classifyChange("PSS-4", 0, 16)).toBeNull();
  });
});

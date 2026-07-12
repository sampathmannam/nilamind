import { describe, it, expect } from "vitest";
import { isSameRecallWindowRetake, RECALL_WINDOW_GUARD_DAYS } from "./assessments";
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

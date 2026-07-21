// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { selectTopNudge, type NudgeCandidate } from "./nudgePrioritization";

describe("selectTopNudge", () => {
  const base: NudgeCandidate = {
    hasSafetyPlanNudge: false,
    hasReCheckIn: false,
    hasPendingDraft: false,
    hasWellbeingDue: false,
    hasAssessmentPrompt: false,
    hasProactiveNudge: false,
  };

  it("returns null when no nudges are available", () => {
    expect(selectTopNudge(base)).toBeNull();
  });

  it("picks safety plan as highest priority", () => {
    expect(selectTopNudge({ ...base, hasSafetyPlanNudge: true, hasReCheckIn: true })).toBe("safety_plan");
  });

  it("picks re-check-in over lower priorities", () => {
    expect(selectTopNudge({ ...base, hasReCheckIn: true, hasWellbeingDue: true })).toBe("re_checkin");
  });

  it("picks pending draft over wellbeing/assessment/proactive", () => {
    expect(selectTopNudge({ ...base, hasPendingDraft: true, hasAssessmentPrompt: true, hasProactiveNudge: true })).toBe("pending_draft");
  });

  it("picks wellbeing due over assessment prompt", () => {
    expect(selectTopNudge({ ...base, hasWellbeingDue: true, hasAssessmentPrompt: true })).toBe("wellbeing_due");
  });

  it("picks assessment prompt over proactive nudge", () => {
    expect(selectTopNudge({ ...base, hasAssessmentPrompt: true, hasProactiveNudge: true })).toBe("assessment_prompt");
  });

  it("picks proactive nudge as lowest priority", () => {
    expect(selectTopNudge({ ...base, hasProactiveNudge: true })).toBe("proactive");
  });

  it("returns null when all flags are false", () => {
    expect(selectTopNudge({ ...base })).toBeNull();
  });

  it("picks only available nudge when exactly one is set", () => {
    expect(selectTopNudge({ ...base, hasAssessmentPrompt: true })).toBe("assessment_prompt");
  });
});

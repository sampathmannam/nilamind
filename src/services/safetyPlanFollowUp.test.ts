/**
 * Safety-plan follow-up loop (B3) — tests.
 *
 * The Stanley-Brown SPI evidence shows the follow-up check-in is the tested
 * ingredient. A static plan (created once and forgotten) tests a weaker version.
 * This module detects staleness and generates gentle review prompts — it never
 * alarms, pressures, or triggers without the user choosing to engage.
 */
import { describe, it, expect } from "vitest";
import {
  daysSinceLastReview,
  isStale,
  safetyPlanFollowUpContextBlock,
  shouldPromptReview,
  isFirstFollowUpDue,
  hasMeaningfulSafetyPlanContent,
  shouldNudgeToCreateSafetyPlan,
  dismissCreateSafetyPlanNudge,
} from "./safetyPlanFollowUp";
import type { SafetyPlan } from "../types";

const planNoTimestamp: SafetyPlan = {
  warningSigns: "irritable, not sleeping",
  internalCoping: "walk the dog, listen to music",
  socialDistractors: "",
  trustedPeople: "Mom: 555-0001",
  professionals: "Dr. Rao: 555-9999",
  safeEnvironment: "give keys to partner",
};

const planToday: SafetyPlan = {
  ...planNoTimestamp,
  lastUpdatedAt: Date.now(),
};

const plan48HoursAgo: SafetyPlan = {
  ...planNoTimestamp,
  lastUpdatedAt: Date.now() - 48 * 60 * 60 * 1000,
};

const plan10DaysAgo: SafetyPlan = {
  ...planNoTimestamp,
  lastUpdatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
};

const plan50DaysAgo: SafetyPlan = {
  ...planNoTimestamp,
  lastUpdatedAt: Date.now() - 50 * 24 * 60 * 60 * 1000,
};

describe("daysSinceLastReview", () => {
  it("returns null when no timestamp exists (legacy plans)", () => {
    expect(daysSinceLastReview(planNoTimestamp)).toBeNull();
  });

  it("returns 0 for a plan updated today", () => {
    expect(daysSinceLastReview(planToday)).toBe(0);
  });

  it("returns ~10 for a plan updated 10 days ago", () => {
    expect(daysSinceLastReview(plan10DaysAgo)).toBe(10);
  });

  it("returns ~50 for a plan updated 50 days ago", () => {
    expect(daysSinceLastReview(plan50DaysAgo)).toBe(50);
  });
});

describe("isStale", () => {
  it("returns false when no timestamp (never reviewed — not 'stale')", () => {
    expect(isStale(planNoTimestamp)).toBe(false);
  });

  it("returns false when updated today (threshold 14 days)", () => {
    expect(isStale(planToday)).toBe(false);
  });

  it("returns false when updated 10 days ago (threshold 14 days)", () => {
    expect(isStale(plan10DaysAgo)).toBe(false);
  });

  it("returns true when updated 50 days ago (threshold 14 days)", () => {
    expect(isStale(plan50DaysAgo)).toBe(true);
  });

  it("respects custom threshold", () => {
    expect(isStale(plan10DaysAgo, { thresholdDays: 7 })).toBe(true);
  });

  // 48-hour first follow-up (Stanley-Brown)
  it("returns true for 48h threshold when plan is 48h old", () => {
    expect(isFirstFollowUpDue(plan48HoursAgo)).toBe(true);
  });

  it("returns false for 48h threshold when plan is 1 day old", () => {
    const plan1DayAgo: SafetyPlan = {
      ...planNoTimestamp,
      lastUpdatedAt: Date.now() - 24 * 60 * 60 * 1000,
    };
    expect(isFirstFollowUpDue(plan1DayAgo)).toBe(false);
  });
});

describe("shouldPromptReview", () => {
  it("returns false when no timestamp (legacy plan — don't nag)", () => {
    expect(shouldPromptReview(planNoTimestamp)).toBe(false);
  });

  it("returns false when updated today", () => {
    expect(shouldPromptReview(planToday)).toBe(false);
  });

  it("returns true when updated 10 days ago (48h follow-up due, 14-day window not yet)", () => {
    // 48h follow-up is due even though 14-day window hasn't passed
    expect(shouldPromptReview(plan10DaysAgo)).toBe(true);
  });

  it("returns true when staler than 14 days", () => {
    expect(shouldPromptReview(plan50DaysAgo)).toBe(true);
  });

  // 48-hour first follow-up (Stanley-Brown)
  it("returns true for 48h first follow-up when plan is 48h old and not done", () => {
    const plan48hNotDone: SafetyPlan = {
      ...plan48HoursAgo,
      firstFollowUpDoneAt: undefined,
    };
    expect(shouldPromptReview(plan48hNotDone)).toBe(true);
  });

  it("returns false for 48h follow-up when already done", () => {
    const plan48hDone: SafetyPlan = {
      ...plan48HoursAgo,
      firstFollowUpDoneAt: Date.now() - 24 * 60 * 60 * 1000,
    };
    expect(shouldPromptReview(plan48hDone)).toBe(false);
  });

  it("returns false for 48h follow-up when plan is 1 day old", () => {
    const plan1DayAgo: SafetyPlan = {
      ...planNoTimestamp,
      lastUpdatedAt: Date.now() - 24 * 60 * 60 * 1000,
      firstFollowUpDoneAt: undefined,
    };
    expect(shouldPromptReview(plan1DayAgo)).toBe(false);
  });
});

describe("isFirstFollowUpDue", () => {
  it("returns true when 48h passed and not done", () => {
    expect(isFirstFollowUpDue(plan48HoursAgo)).toBe(true);
  });

  it("returns false when already done", () => {
    const planDone: SafetyPlan = {
      ...plan48HoursAgo,
      firstFollowUpDoneAt: Date.now(),
    };
    expect(isFirstFollowUpDue(planDone)).toBe(false);
  });

  it("returns false when < 48h passed", () => {
    expect(isFirstFollowUpDue(planToday)).toBe(false);
    const plan1DayAgo: SafetyPlan = {
      ...planNoTimestamp,
      lastUpdatedAt: Date.now() - 24 * 60 * 60 * 1000,
    };
    expect(isFirstFollowUpDue(plan1DayAgo)).toBe(false);
  });

  it("returns false for legacy plan (no timestamp)", () => {
    expect(isFirstFollowUpDue(planNoTimestamp)).toBe(false);
  });
});

describe("safetyPlanFollowUpContextBlock", () => {
  it("returns empty string for no timestamp", () => {
    expect(safetyPlanFollowUpContextBlock(planNoTimestamp)).toBe("");
  });

  it("returns empty string for a fresh plan (today)", () => {
    expect(safetyPlanFollowUpContextBlock(planToday)).toBe("");
  });

  it("returns a gentle follow-up hint for a stale plan", () => {
    const block = safetyPlanFollowUpContextBlock(plan50DaysAgo);
    expect(block.length).toBeGreaterThan(0);
    // Never alarming language
    expect(block.toLowerCase()).not.toMatch(/must|should|need to|warning|danger|urgent/);
    // Should mention the plan
    expect(block).toMatch(/safety plan/i);
    // Should mention the day count
    expect(block).toContain("50");
  });

  it("never uses alarmist language on any stale plan", () => {
    const block = safetyPlanFollowUpContextBlock(plan50DaysAgo);
    const alarmPatterns = /must\b|should\b|need to\b|warning\b|danger\b|urgent\b|immediate\b|critical\b/;
    expect(block.toLowerCase()).not.toMatch(alarmPatterns);
  });
});

const blankPlan: SafetyPlan = {
  warningSigns: "",
  internalCoping: "",
  socialDistractors: "",
  trustedPeople: "",
  professionals: "",
  safeEnvironment: "",
};

describe("hasMeaningfulSafetyPlanContent (Gamarra et al. 2015 — quality, not completeness, predicts outcomes)", () => {
  it("false for a fully blank plan", () => {
    expect(hasMeaningfulSafetyPlanContent(blankPlan)).toBe(false);
  });

  it("false for whitespace-only fields", () => {
    expect(hasMeaningfulSafetyPlanContent({ ...blankPlan, warningSigns: "   " })).toBe(false);
  });

  it("false for a scrap shorter than the meaningful-content floor", () => {
    expect(hasMeaningfulSafetyPlanContent({ ...blankPlan, internalCoping: "walk" })).toBe(false);
  });

  it("true when at least one field has a real personalized sentence", () => {
    expect(hasMeaningfulSafetyPlanContent({ ...blankPlan, warningSigns: "not sleeping, going quiet" })).toBe(true);
  });
});

describe("shouldNudgeToCreateSafetyPlan (the create-nudge that doesn't exist today — only review-nudges do)", () => {
  it("true for a blank plan with no prior dismissal", () => {
    expect(shouldNudgeToCreateSafetyPlan(blankPlan)).toBe(true);
  });

  it("false once the plan has meaningful content", () => {
    expect(shouldNudgeToCreateSafetyPlan({ ...blankPlan, warningSigns: "not sleeping, going quiet" })).toBe(false);
  });

  it("dismissCreateSafetyPlanNudge never throws even with no storage backing (node env)", () => {
    expect(() => dismissCreateSafetyPlanNudge()).not.toThrow();
  });
});

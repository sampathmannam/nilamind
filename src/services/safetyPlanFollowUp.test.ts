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
});

describe("shouldPromptReview", () => {
  it("returns false when no timestamp (legacy plan — don't nag)", () => {
    expect(shouldPromptReview(planNoTimestamp)).toBe(false);
  });

  it("returns false when updated today", () => {
    expect(shouldPromptReview(planToday)).toBe(false);
  });

  it("returns false when updated 10 days ago (within 14-day window)", () => {
    expect(shouldPromptReview(plan10DaysAgo)).toBe(false);
  });

  it("returns true when staler than 14 days", () => {
    expect(shouldPromptReview(plan50DaysAgo)).toBe(true);
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

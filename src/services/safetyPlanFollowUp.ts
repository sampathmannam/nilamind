/**
 * Safety-plan follow-up loop (B3 — Stanley-Brown SPI).
 *
 * The follow-up check-in after the plan is the tested ingredient (~50% reduction).
 * A static plan (created once and forgotten) tests a weaker version.
 *
 * This module is PURE and deterministic. It never triggers push notifications or
 * background processes — it computes staleness and generates gentle context blocks
 * for Nila to surface in conversation. The user always chooses to engage.
 *
 * 🟡 FLAG: safety-critical — review the diff before merge (AGENTS.md rule).
 */
import type { SafetyPlan } from "../types";
import { secureLocal } from "./secureLocal";
import { parseSafetyPlan } from "./safetyPlan";

/** Stanley-Brown evidence: first follow-up within 48h, then every 14 days. */
const FIRST_FOLLOW_UP_HOURS = 48;
const STALE_THRESHOLD_DAYS = 14;

/** Round epoch-ms difference down to integer days. */
export function daysSinceLastReview(plan: SafetyPlan): number | null {
  if (plan.lastUpdatedAt == null) return null;
  return Math.floor((Date.now() - plan.lastUpdatedAt) / (1000 * 60 * 60 * 24));
}

/** Hours since plan was created/last updated. */
export function hoursSinceLastUpdate(plan: SafetyPlan): number | null {
  if (plan.lastUpdatedAt == null) return null;
  return Math.floor((Date.now() - plan.lastUpdatedAt) / (1000 * 60 * 60));
}

/** True when the 48h first follow-up window has passed and follow-up hasn't been done. */
export function isFirstFollowUpDue(plan: SafetyPlan): boolean {
  if (plan.firstFollowUpDoneAt != null) return false; // already done
  if (plan.lastUpdatedAt == null) return false; // never saved
  return hoursSinceLastUpdate(plan) !== null && hoursSinceLastUpdate(plan)! >= FIRST_FOLLOW_UP_HOURS;
}

export interface StalenessOptions {
  thresholdDays?: number;
}

/** True when the periodic (14-day) review is due. */
export function isStale(plan: SafetyPlan, opts: StalenessOptions = {}): boolean {
  if (plan.lastUpdatedAt == null) return false; // legacy plan — never reviewed intentionally
  return daysSinceLastReview(plan) !== null && daysSinceLastReview(plan)! >= (opts.thresholdDays ?? 14);
}

/** Gate for surfacing a review prompt in the UI. Includes 48h first follow-up and 14-day periodic. */
export function shouldPromptReview(plan: SafetyPlan): boolean {
  return isFirstFollowUpDue(plan) || isStale(plan);
}

/** True when ANY follow-up is due (48h first or 14-day periodic). */
export function isAnyFollowUpDue(plan: SafetyPlan): boolean {
  return isFirstFollowUpDue(plan) || isStale(plan);
}

/**
 * Generates a gentle context block for Nila's system prompt when a follow-up is due.
 * Returns "" when no follow-up hint is needed. Never uses alarmist language.
 */
export function safetyPlanFollowUpContextBlock(plan: SafetyPlan): string {
  const parts: string[] = [];

  // 48h first follow-up
  if (isFirstFollowUpDue(plan)) {
    const hrs = hoursSinceLastUpdate(plan) ?? 0;
    parts.push(
      `SAFETY-PLAN FOLLOW-UP (first, ~48h window — gentle invitation, never a push)`,
      `It's been about ${hrs} hours since their safety plan was created/updated. The first follow-up`,
      `within ~48h is the most impactful part of the Stanley-Brown protocol. You can gently`,
      `mention it if it feels natural — e.g., "I noticed it's been a couple of days since you`,
      `made your safety plan. No pressure at all, but I'm here if you want to walk through`,
      `it together or make any tweaks." Never ask "did you use it?" — that's evaluative.`,
      `Keep it light: a reminder the plan exists and they can update it whenever.`
    );
  }

  // Periodic 14-day review
  if (isStale(plan)) {
    const days = daysSinceLastReview(plan);
    if (days != null && days >= 14) {
      parts.push(
        `SAFETY-PLAN REVIEW (periodic, ~14 days — gentle invitation, never a push)`,
        `Their safety plan was last reviewed about ${days} days ago. You can gently`,
        `mention it if it feels natural — e.g., "It's been a little while since you looked`,
        `at your safety plan. No pressure, just a quiet nudge if now feels like a helpful`,
        `time." Never ask "have you used it?" or "did it help?" — those feel evaluative.`,
        `Keep it light: a reminder the plan exists and they can update it whenever.`
      );
    }
  }

  return parts.join("\n\n");
}

/**
 * Mark the 48h first follow-up as done (e.g. user tapped "Looks good" on the follow-up prompt).
 * Updates only the timestamp without changing the plan's content. Returns true on success.
 */
export function markFirstFollowUpDone(): boolean {
  try {
    const raw = secureLocal.getItem("nilamind_safetyplan");
    const plan = parseSafetyPlan(raw);
    plan.firstFollowUpDoneAt = Date.now();
    secureLocal.setItem("nilamind_safetyplan", JSON.stringify(plan));
    return true;
  } catch {
    return false;
  }
}

/**
 * Mark the safety plan as reviewed now (e.g. user tapped "Looks good" on a review prompt).
 * Updates only the timestamp without changing the plan's content. Returns true on success.
 */
export function markSafetyPlanReviewed(): boolean {
  try {
    const raw = secureLocal.getItem("nilamind_safetyplan");
    const plan = parseSafetyPlan(raw);
    plan.lastUpdatedAt = Date.now();
    secureLocal.setItem("nilamind_safetyplan", JSON.stringify(plan));
    return true;
  } catch {
    return false;
  }
}

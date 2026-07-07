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
const DEFAULT_STALE_THRESHOLD_DAYS = 14;

/** Round epoch-ms difference down to integer days. */
export function daysSinceLastReview(plan: SafetyPlan): number | null {
  if (plan.lastUpdatedAt == null) return null;
  return Math.floor((Date.now() - plan.lastUpdatedAt) / (1000 * 60 * 60 * 24));
}

export interface StalenessOptions {
  thresholdDays?: number;
}

/** True when the safety plan hasn't been reviewed within the threshold window. */
export function isStale(plan: SafetyPlan, opts: StalenessOptions = {}): boolean {
  const days = daysSinceLastReview(plan);
  if (days == null) return false; // legacy plan — never reviewed intentionally, don't call it stale
  return days >= (opts.thresholdDays ?? DEFAULT_STALE_THRESHOLD_DAYS);
}

/** Gate for surfacing a review prompt in the UI. Currently: stale by the default threshold. */
export function shouldPromptReview(plan: SafetyPlan): boolean {
  return isStale(plan);
}

/**
 * Generates a gentle context block for Nila's system prompt when the safety plan is stale.
 * Returns "" when no follow-up hint is needed. Never uses alarmist language.
 */
export function safetyPlanFollowUpContextBlock(plan: SafetyPlan): string {
  const days = daysSinceLastReview(plan);
  if (days == null || days < DEFAULT_STALE_THRESHOLD_DAYS) return "";

  // Gentle invitation — never a demand
  return [
    `SAFETY-PLAN FOLLOW-UP (gentle — this is an invitation, never a push)`,
    `They last reviewed their safety plan about ${days} days ago. You can gently`,
    `mention it if it feels natural — e.g., "I noticed it's been a little while since`,
    `you looked at your safety plan. No pressure at all, just a quiet nudge if now`,
    `feels like a helpful time." Never ask "have you used it?" or "did it help?" —`,
    `those can feel evaluative. Keep it light: a reminder that the plan exists and`,
    `they can update it whenever they want.`,
  ].join(" ");
}

/**
 * Mark the safety plan as reviewed now (e.g. user tapped "Looks good" on a follow-up prompt).
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

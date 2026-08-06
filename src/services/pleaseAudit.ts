/**
 * PLEASE Vulnerability Audit (Feature 7 / Phase G).
 *
 * Evidence: ABC PLEASE (Linehan 2015), Littlewood et al. 2016 (sleep → next-day emotion
 * intensity), Astill Wright 2026 (not treatment), SmartBipolar 2026 (monitoring alone = null).
 *
 * 60-second 5-item self-audit: sleep / food / movement / substances / mastery.
 * Folds real sleep data to predict the risky window: short-sleep night → higher
 * next-day emotional intensity → gentle proactive nudge.
 *
 * Pure service — no React, no side-effects.
 */

import { secureLocal } from "./secureLocal";

export type VulnerabilityLevel = "low" | "moderate" | "high";

export interface PleaseAudit {
  id: string;
  date: string;
  timestamp: string;
  /** 0 = terrible, 3 = great */
  sleep: 0 | 1 | 2 | 3;
  food: 0 | 1 | 2 | 3;
  movement: 0 | 1 | 2 | 3;
  /** 0 = heavy use, 3 = none */
  substances: 0 | 1 | 2 | 3;
  mastery: 0 | 1 | 2 | 3;
}

let _seq = 0;

/** Generate a unique id for an audit entry. */
export function auditId(): string {
  return `please_${Date.now()}_${++_seq}`;
}

const ITEMS = [
  { key: "sleep" as const, label: "How did you sleep?", good: "Rested", bad: "Terrible" },
  { key: "food" as const, label: "Did you eat a proper meal today?", good: "Ate well", bad: "Skipped meals" },
  { key: "movement" as const, label: "Did you move your body today?", good: "Moved", bad: "Sedentary" },
  { key: "substances" as const, label: "Did you use anything to cope today?", good: "None", bad: "Used to cope" },
  { key: "mastery" as const, label: "Did you do something that felt meaningful?", good: "Yes", bad: "Nothing" },
] as const;

export const PLEASE_ITEMS = ITEMS;

/**
 * Compute the vulnerability window from audit scores + sleep data.
 *
 * Scoring: each item 0–3, total 0–15.
 *   - score ≤ 5  OR  sleep < 6 hours → "high"
 *   - score ≤ 8                      → "moderate"
 *   - otherwise                       → "low"
 */
export function computeVulnerabilityWindow(
  audit: Pick<PleaseAudit, "sleep" | "food" | "movement" | "substances" | "mastery">,
  sleepHours?: number,
): VulnerabilityLevel {
  const score = audit.sleep + audit.food + audit.movement + audit.substances + audit.mastery;
  const sleepRisk = typeof sleepHours === "number" && sleepHours < 6;
  if (score <= 5 || sleepRisk) return "high";
  if (score <= 8) return "moderate";
  return "low";
}

/**
 * Generate a gentle proactive nudge based on vulnerability level.
 * Returns null for "low" — no nudge needed.
 *
 * Copy is India-first: relational framing, not clinical.
 */
export function generateNudge(window: VulnerabilityLevel): string | null {
  if (window === "high") {
    return "Your body may be more vulnerable today. One small act of care can help — a meal, a glass of water, a few deep breaths.";
  }
  if (window === "moderate") {
    return "A few things are off today. What's one small thing you can do right now to care for yourself?";
  }
  return null;
}

/**
 * Total score from a PLEASE audit (0–15). Convenience for nilaContext / clinician summary.
 */
export function pleaseTotal(audit: Pick<PleaseAudit, "sleep" | "food" | "movement" | "substances" | "mastery">): number {
  return audit.sleep + audit.food + audit.movement + audit.substances + audit.mastery;
}

/**
 * True when no PLEASE audit has been completed today.
 * Used by the TodayScreen nudge rail to show the vulnerability check prompt.
 * Fail-closed: returns false on read error (don't nudge on storage failure).
 */
export function isPleaseAuditDue(): boolean {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = secureLocal.getItem("nilamind_please_audit");
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return true;
    return !parsed.some((a: any) => a && typeof a.date === "string" && a.date === today);
  } catch {
    return false;
  }
}

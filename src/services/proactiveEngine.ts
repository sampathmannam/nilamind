// proactiveEngine — computes the single best proactive moment for Nila to surface.
// Pure, deterministic, no network. Reads existing signals and decides what to offer.
// Anti-fatigue: max 1 proactive moment per app open, 24h cooldown per type, respects dismissals.

import { selfReportSleepSignal } from "./sleepInsight";
import { hasCheckinToday, getSkipFlag } from "./checkin";
import { secureLocal } from "./secureLocal";
import { DAY_MS } from "./storageUtils";
import type { NilaCard } from "./nilaOrchestration";
import { getUserState } from "./modeEngine";
import { isSafetySuppressed } from "./notificationSuppress";
import { parseSafetyPlan } from "./safetyPlan";

const DISMISS_PREFIX = "nilamind_proactive_dismiss_";
const COOLDOWN_MS = 24 * DAY_MS; // 24 hours between same-type offers
const MAX_PER_OPEN = 1; // max proactive moments per app session

export type ProactiveMoment = {
  card: NilaCard;
  trigger: string;
  priority: number; // 1=highest, 10=lowest
  cooldownMs: number;
  dismissKey: string;
  /** Human-readable reason for the moment (for Nila's context). */
  reason: string;
};

function getDismissedAt(key: string): number {
  try {
    const val = secureLocal.getItem(DISMISS_PREFIX + key);
    return val ? Number(val) : 0;
  } catch {
    return 0;
  }
}

function setDismissedAt(key: string): void {
  try {
    secureLocal.setItem(DISMISS_PREFIX + key, String(Date.now()));
  } catch { /* ignore */ }
}

function isCooldownActive(key: string, cooldownMs: number): boolean {
  const dismissed = getDismissedAt(key);
  return dismissed > 0 && Date.now() - dismissed < cooldownMs;
}

/** Should this proactive moment be suppressed? Returns true if dismissed recently. */
export function isProactiveDismissed(key: string, cooldownMs = COOLDOWN_MS): boolean {
  return isCooldownActive(key, cooldownMs);
}

/** Mark a proactive moment as dismissed (user tapped "Not now"). */
export function dismissProactive(key: string): void {
  setDismissedAt(key);
}

/** Should we show ANY proactive moment this session? Check the per-session counter. */
const SESSION_KEY = "nilamind_proactive_session_ts";
export function canShowProactive(): boolean {
  try {
    const last = secureLocal.getItem(SESSION_KEY);
    if (!last) return true;
    const ts = Number(last);
    // Different session if >5 minutes since last app-open
    return Date.now() - ts > 5 * 60 * 1000;
  } catch {
    return true;
  }
}

/** Record that a proactive moment was shown this session. */
export function recordProactiveShown(): void {
  try {
    secureLocal.setItem(SESSION_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

/** Read check-in count for today. */
function checkinCountToday(): number {
  const today = new Date().toISOString().split("T")[0];
  try {
    const raw = secureLocal.getItem("nilamind_checkins");
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return 0;
    return parsed.filter((e: any) => e?.date === today).length;
  } catch {
    return 0;
  }
}

/** Read days since last check-in. */
function daysSinceLastCheckin(): number {
  try {
    const raw = secureLocal.getItem("nilamind_checkins");
    if (!raw) return 999;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return 999;
    const sorted = [...parsed].sort((a: any, b: any) => (b.date ?? "").localeCompare(a.date ?? ""));
    const last = sorted[0];
    if (!last?.date) return 999;
    const diff = Math.floor((Date.now() - new Date(last.date + "T00:00:00").getTime()) / DAY_MS);
    return diff;
  } catch {
    return 999;
  }
}

/** Check if medication was logged today. */
function medicationLoggedToday(): boolean {
  const today = new Date().toISOString().split("T")[0];
  try {
    const raw = secureLocal.getItem("nilamind_med_log_" + today);
    if (!raw) return false;
    const log = JSON.parse(raw);
    return Array.isArray(log?.doses) && log.doses.length > 0;
  } catch {
    return false;
  }
}

/** Compute the best proactive moment. Returns null if nothing fires (silence is fine). */
export function computeProactiveMoment(): ProactiveMoment | null {
  if (!canShowProactive()) return null;

  const moments: ProactiveMoment[] = [];
  const today = new Date().toISOString().split("T")[0];
  const hour = new Date().getHours();

  // 1. Check-in due (highest non-crisis priority)
  if (!hasCheckinToday(today) && getSkipFlag() !== today) {
    const key = "checkin_due";
    if (!isProactiveDismissed(key)) {
      moments.push({
        card: { kind: "skill", skillId: "checkin", label: "How are you feeling right now?", inline: true },
        trigger: "no_checkin_today",
        priority: 2,
        cooldownMs: COOLDOWN_MS,
        dismissKey: key,
        reason: "No check-in today",
      });
    }
  }

  // 2. Sleep prodrome — short sleep detected
  const sleepSignal = selfReportSleepSignal();
  if (sleepSignal?.firing) {
    const key = "winddown_sleep";
    if (!isProactiveDismissed(key)) {
      moments.push({
        card: { kind: "wind_down_inline", label: "Your sleep's been short lately. Want to wind down?", inline: true },
        trigger: "sleep_prodrome",
        priority: 3,
        cooldownMs: COOLDOWN_MS,
        dismissKey: key,
        reason: "Short sleep detected",
      });
    }
  }

  // 3. Evening wind-down (after 8pm, before midnight)
  if (hour >= 20 && hour <= 23) {
    const key = "winddown_evening";
    if (!isProactiveDismissed(key)) {
      moments.push({
        card: { kind: "wind_down_inline", label: "Ready to wind down for sleep?", inline: true },
        trigger: "evening_winddown",
        priority: 4,
        cooldownMs: COOLDOWN_MS,
        dismissKey: key,
        reason: "Evening wind-down time",
      });
    }
  }

  // 4. Medication reminder (morning, if not logged)
  if (hour >= 8 && hour <= 12 && !medicationLoggedToday()) {
    const key = "medication_morning";
    if (!isProactiveDismissed(key)) {
      moments.push({
        card: { kind: "medication_check", label: "Did you take your medication today?", inline: true },
        trigger: "morning_medication",
        priority: 5,
        cooldownMs: COOLDOWN_MS,
        dismissKey: key,
        reason: "Morning medication check",
      });
    }
  }

  // 5. Evening diary reminder (after 6pm, if no diary today)
  if (hour >= 18 && hour <= 23) {
    const diaryKey = "nilamind_diary_" + today;
    const hasDiary = secureLocal.getItem(diaryKey);
    if (!hasDiary) {
      const key = "diary_evening";
      if (!isProactiveDismissed(key)) {
        moments.push({
          card: { kind: "diary_quick", label: "Want to log how today went?", inline: true },
          trigger: "evening_no_diary",
          priority: 6,
          cooldownMs: COOLDOWN_MS,
          dismissKey: key,
          reason: "Evening diary reminder",
        });
      }
    }
  }

  // 6. Inactivity nudge (3+ days since last check-in)
  const daysSince = daysSinceLastCheckin();
  if (daysSince >= 3) {
    const key = "inactivity_nudge";
    if (!isProactiveDismissed(key, 3 * DAY_MS)) {
      moments.push({
        card: { kind: "skill", skillId: "checkin", label: "Haven't heard from you in a bit. How are you?", inline: true },
        trigger: "inactivity",
        priority: 7,
        cooldownMs: 3 * DAY_MS,
        dismissKey: key,
        reason: `${daysSince} days since last check-in`,
      });
    }
  }

  // 7. Weekly summary (Sundays)
  if (new Date().getDay() === 0) {
    const key = "weekly_summary";
    if (!isProactiveDismissed(key, 7 * DAY_MS)) {
      moments.push({
        card: { kind: "weekly_synthesis", label: "See how your week went" },
        trigger: "weekly_sunday",
        priority: 8,
        cooldownMs: 7 * DAY_MS,
        dismissKey: key,
        reason: "Weekly summary available",
      });
    }
  }

  if (moments.length === 0) return null;

  // Return the highest-priority (lowest number) moment
  moments.sort((a, b) => a.priority - b.priority);
  return moments[0];
}

const SAFETY_PLAN_NUDGE_KEY = "safety_plan_nudge";
const SAFETY_PLAN_NUDGE_COOLDOWN_MS = 7 * DAY_MS; // matches computeProactiveMoment()'s weekly_summary precedent

/** True if any of the 6 safety-plan sections is still blank (never written, or written then cleared). */
function hasBlankSafetyPlanSection(): boolean {
  try {
    const plan = parseSafetyPlan(secureLocal.getItem("nilamind_safetyplan"));
    return [
      plan.warningSigns, plan.internalCoping, plan.socialDistractors,
      plan.trustedPeople, plan.professionals, plan.safeEnvironment,
    ].some((s) => !s || !s.trim());
  } catch {
    return false; // fail-closed on the SURFACE side — never nag on a read error
  }
}

/**
 * Calm-moment safety-plan nudge (2026-07-12 Wave 3, Task 1.5) — a gentle, NEVER-crisis-moment invitation to
 * fill in a blank safety-plan section. Deliberately a standalone pure check (not folded into
 * computeProactiveMoment()'s moments array, whose NilaCard output is only ever consumed as LLM system-prompt
 * context today, not rendered as a UI card) so a real surfacing component can call it directly. Reuses
 * existing infra rather than inventing new plumbing:
 *  - "mostly calm" mood signal: modeEngine.ts's getUserState() === "calm" — the same derived state ModeScreen
 *    already reads, never a new mood-detection path.
 *  - "no recent crisis": notificationSuppress.ts's isSafetySuppressed() — the SAME 24h crisis/elevation latch
 *    P6.4 already uses to gate every other "how are you?" nudge (EMA, daily reminders).
 *  - cooldown: isProactiveDismissed/dismissProactive, this module's existing per-trigger-key primitive.
 * 7-day cooldown once dismissed, matching this file's existing weekly_summary precedent (not a new number).
 */
export function calmSafetyPlanNudge(): { show: boolean; label: string } | null {
  if (getUserState() !== "calm") return null;
  if (isSafetySuppressed()) return null;
  if (!hasBlankSafetyPlanSection()) return null;
  if (isProactiveDismissed(SAFETY_PLAN_NUDGE_KEY, SAFETY_PLAN_NUDGE_COOLDOWN_MS)) return null;
  return { show: true, label: "A calm moment — want to fill in a bit more of your safety plan?" };
}

/** Dismiss the calm-moment safety-plan nudge for the standard 7-day cooldown (reuses dismissProactive). */
export function dismissCalmSafetyPlanNudge(): void {
  dismissProactive(SAFETY_PLAN_NUDGE_KEY);
}

/**
 * Build a context block for Nila's system prompt about the current proactive moment.
 * This tells Nila what moment is being surfaced and why, so she can reference it naturally.
 */
export function proactiveContextBlock(moment: ProactiveMoment | null): string {
  if (!moment) return "";
  return [
    "PROACTIVE MOMENT (the app surfaced this to the person)",
    `The app offered: "${moment.card.label}" (reason: ${moment.reason}).`,
    "If they accepted, guide them through it warmly. If they dismissed it, respect that — don't re-offer.",
  ].join("\n");
}

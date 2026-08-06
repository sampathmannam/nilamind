import { useState, useEffect } from "react";
import { secureLocal } from "../services/secureLocal";
import { parseSafetyPlan } from "../services/safetyPlan";
import {
  shouldPromptReview,
  isFirstFollowUpDue,
  markFirstFollowUpDone,
  markSafetyPlanReviewed,
} from "../services/safetyPlanFollowUp";
import { selfReportSleepSignal } from "../services/sleepInsight";
import { isSafetySuppressed } from "../services/notificationSuppress";

// useAmbientSignals — the SERVICE-BASED subset of useNudges' ambient signals, for Home's single
// AmbientSlot (redesign §5.1). Deliberately excludes every chat-context signal (jitai, calm, pact,
// welcome-back need messages/hadCrisisRef and belong to chat surfaces; jitai's live surface remains
// DashboardScreen). The safety-plan computation mirrors useNudges' B3 effect body; evaluation is
// mount-time only — Home remounts on every tab visit, which is the slot's refresh cadence (no
// 5-minute poll on the Home tab). §9: the 24h crisis-suppression latch (isSafetySuppressed) blanks
// the slot entirely — never a prompt of any kind next to a crisis.

export type SafetyPlanCardState = "review" | "followup" | null;

export interface AmbientSignals {
  safetyPlanCard: SafetyPlanCardState;
  sleepNudge: { firing: boolean; detail: string } | null;
  suppressed: boolean;
  /** "Looks good" on the review card — records the review, hides the card. */
  completeReview: () => void;
  /** "Done" on the follow-up card — records the follow-up, hides the card. */
  completeFollowUp: () => void;
  /** Opening the plan from the card — hide without marking (if still stale, it returns next visit). */
  hideSafetyPlanCard: () => void;
  dismissSleep: () => void;
}

export function useAmbientSignals(): AmbientSignals {
  const [safetyPlanCard, setSafetyPlanCard] = useState<SafetyPlanCardState>(null);
  const [sleepNudge, setSleepNudge] = useState<{ firing: boolean; detail: string } | null>(null);
  const [suppressed] = useState<boolean>(() => {
    try { return isSafetySuppressed(); } catch { return false; }
  });

  useEffect(() => {
    // Mirrors useNudges' B3 safety-plan staleness check; follow-up outranks review (same precedence
    // the chat rail's selectVisibleNudges used — the first look-back is the part research shows helps).
    try {
      const raw = secureLocal.getItem("nilamind_safetyplan");
      const plan = parseSafetyPlan(raw);
      const followup = isFirstFollowUpDue(plan);
      const review = shouldPromptReview(plan);
      setSafetyPlanCard(followup ? "followup" : review ? "review" : null);
    } catch {
      setSafetyPlanCard(null);
    }
    try {
      setSleepNudge(selfReportSleepSignal());
    } catch { /* best-effort */ }
  }, []);

  return {
    safetyPlanCard,
    sleepNudge,
    suppressed,
    completeReview: () => {
      markSafetyPlanReviewed();
      setSafetyPlanCard(null);
    },
    completeFollowUp: () => {
      markFirstFollowUpDone();
      setSafetyPlanCard(null);
    },
    hideSafetyPlanCard: () => setSafetyPlanCard(null),
    dismissSleep: () => setSleepNudge(null),
  };
}

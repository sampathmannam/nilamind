// Circadian rhythm stabilization feedback loop — fuses sleep regularity (circadian.ts) and
// social rhythm regularity (socialRhythm.ts) into a single combined score, with structured
// guidance text. Inspired by the Circadian Rhythm Management (CRM) app approach (~3.4× recurrence
// reduction for MDD/BD in the CRM trial, NCT05400785; Yeom, Jeong, Moon et al., 2026, American
// Journal of Psychiatry — corrected 2026-07-12 from a nonexistent "Gottlieb et al. 2025" citation).
//
// 🟡 Safety: sleep-related proactive guidance — never recommends sleep restriction.
// All guidance is population-safe (manic-first, bipolar-aware).

import { regularityFromStd } from "./circadian";
import { loadMoodHistory } from "./moodHistory";
import { computeRhythmRegularity } from "./socialRhythm";

export interface CircadianFeedback {
  combinedScore: number; // 0–100, higher = more regular
  sleepRegularity: number; // 0–100 from sleep hours CV
  rhythmRegularity: number; // 0–100 from social rhythm SD
  needsAttention: boolean;
  guidance: string;
}

function sleepRegularityScore(sleeps: number[]): number {
  if (sleeps.length < 3) return 0;
  const mean = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
  const sd = Math.sqrt(sleeps.reduce((a, b) => a + (b - mean) ** 2, 0) / sleeps.length);
  return regularityFromStd(mean, sd);
}

/** Map social rhythm variability (min SD) to a 0–100 score:
 *   < 30 min SD → 100 (very regular)
 *   ≥ 120 min SD → 0 (very irregular)
 *   linear in between. */
function rhythmRegularityScore(variabilityMin: number | null): number {
  if (variabilityMin === null) return 50; // neutral midpoint when no data
  const clamped = Math.max(0, Math.min(120, variabilityMin));
  return Math.round(100 - (clamped / 120) * 100);
}

function generateGuidance(
  sleepRegScore: number,
  rhythmRegScore: number,
  sleeps: number[],
): string {
  const combined = (sleepRegScore + rhythmRegScore) / 2;
  const sleepMean = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
  const sleepSd = Math.sqrt(sleeps.reduce((a, b) => a + (b - sleepMean) ** 2, 0) / sleeps.length);

  if (combined >= 80) {
    return "Your circadian rhythm is looking steady. Keeping a consistent wake time and morning light exposure protects this stability.";
  }

  if (sleepSd >= 1.5 && rhythmRegScore < 50) {
    return "Both your sleep timing and daily routine have been irregular. Anchoring a consistent wake-up time is the single most effective step — it stabilises your body clock and your mood. Try setting a wake time within the same 30-minute window each day.";
  }

  if (sleepSd >= 1.5) {
    return "Your sleep hours have been swinging night to night (≥1.5h variation). A consistent wake-up time — even on weekends — is the strongest lever for stabilising your rhythm. Morning light exposure within 30 minutes of waking helps lock it in.";
  }

  if (rhythmRegScore < 50) {
    return "Your daily routine timing has been variable. The Social Rhythm Metric tracks five anchors (wake, first contact, start of activity, dinner, bed). Try steadying one anchor this week — the wake time has the biggest ripple effect.";
  }

  if (sleepMean < 6) {
    return "Your average sleep is under 6 hours. Protecting a consistent 7+ hour window (even if you don't sleep the whole time) helps mood stability more than sleeping longer at irregular times.";
  }

  return "Your rhythm is generally steady. Small daily routines — same wake time, morning light, regular meals — quietly protect mood stability over weeks.";
}

export function computeCircadianFeedback(params: {
  sleeps: number[];
  rhythmVariabilityMin?: number | null;
}): CircadianFeedback | null {
  if (params.sleeps.length < 3) return null;

  const sleepReg = sleepRegularityScore(params.sleeps);
  const rhythmReg = rhythmRegularityScore(params.rhythmVariabilityMin ?? null);
  const combinedScore = Math.round((sleepReg + rhythmReg) / 2);

  return {
    combinedScore,
    sleepRegularity: sleepReg,
    rhythmRegularity: rhythmReg,
    needsAttention: combinedScore < 60,
    guidance: generateGuidance(sleepReg, rhythmReg, params.sleeps),
  };
}

/** Gather current sleep + social-rhythm data and return the fused feedback (null if <3 nights logged).
 *  Mirrors the data-gathering already used in nilaContext.buildPersonalContext so the proactive engine and
 *  Nila's chat context never diverge. */
export function currentCircadianFeedback(): CircadianFeedback | null {
  try {
    const moodHist = loadMoodHistory();
    const sleeps = moodHist
      .filter((m) => typeof m.sleepHours === "number" && m.sleepHours > 0)
      .map((m) => m.sleepHours as number);
    if (sleeps.length < 3) return null;
    const rhythm = computeRhythmRegularity();
    return computeCircadianFeedback({ sleeps, rhythmVariabilityMin: rhythm.overallVariabilityMin });
  } catch {
    return null;
  }
}

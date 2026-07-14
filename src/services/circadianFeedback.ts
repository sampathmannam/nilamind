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
import type { SleepWindow } from "./socialRhythm";

export interface CircadianFeedback {
  combinedScore: number; // 0–100, higher = more regular
  sleepRegularity: number; // 0–100 from sleep hours CV
  rhythmRegularity: number; // 0–100 from social rhythm SD
  needsAttention: boolean;
  guidance: string;
}

// NOTE (Group C correction, 2026-07-12): this is a DURATION-variability proxy (coefficient-of-variation of
// nightly total sleep hours) — it has no clock-time/timing information at all. It is NOT the Sleep
// Regularity Index and is kept here, unchanged, as the separate "sleep duration consistency" metric per the
// spec's explicit instruction not to fold it back into the real SRI (see computeSleepRegularityIndex below)
// — that exact conflation (duration steadiness silently standing in for timing regularity) was the bug.
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

// ── Group C: the REAL Sleep Regularity Index (Phillips et al. 2017, Scientific Reports 7:3216) ──
//
//   SRI = -100 + 200/(M·(N-1)) · Σ_j Σ_i δ(s_{i,j}, s_{i+1,j})
//
// where s_{i,j} is the binary asleep/awake state at epoch j on night i, and δ=1 when that same clock-time
// epoch has the same state 24h later. This is genuinely per-epoch clock-time agreement between consecutive
// nights — NOT the duration-CV proxy above. Data source: socialRhythm.ts's buildSleepWindows() (Health
// Connect timestamps when available, Social Rhythm Metric bed/wake anchors as fallback) — methodologically
// the same diary-bed/wake-clock-time input class the founding 2017 paper itself used.
//
// Epoch resolution: 10-minute bins. The spec's own guidance is that 5-10 min bins are fine — resolution
// only matters at the two boundary edges, since each night's asleep state is one contiguous
// wraparound-safe block between bedtime and wake-time (no naps/fragmentation modeled; Health Connect is
// deliberately locked to duration/timing only, never sleep stage).
const SRI_BIN_MIN = 10;
const SRI_BINS_PER_DAY = 1440 / SRI_BIN_MIN; // 144

/** Field-standard practical minimum (Windred et al. 2024, `sleepreg` package): >=120h of 24h-separated
 *  epoch pairs, i.e. >=5 valid nights. We use the app's existing MIN_NIGHTS=7 / MIN_RHYTHM_DAYS=5
 *  convention (stricter, matching other on-device signals) rather than the bare field minimum. */
export const MIN_SRI_NIGHTS = 7;

export type SriBand = "regular" | "moderately_irregular" | "irregular" | "insufficient";

export interface SleepRegularityResult {
  /** Phillips 2017 SRI, theoretical -100..+100; real-world scores cluster ~0-100 (UK Biobank median 81,
   *  IQR 73.8-86.3, Windred et al. 2024). */
  sri: number;
  /** Distinct nights that contributed to at least one consecutive-day pair. */
  nightsUsed: number;
  /** Consecutive-day pairs actually summed (gap-tolerant — see below). */
  pairsUsed: number;
  band: SriBand;
  guidance: string;
}

/** Wraparound-safe 10-min-epoch asleep/awake vector for one night, from its bed/wake clock times (minutes
 *  since midnight). Handles the midnight crossing the same way socialRhythm.ts's circularStats handles it
 *  for the mean/SD case: a bedtime after a wake-time (the normal case, e.g. 23:00 -> 07:00) is asleep
 *  through midnight; a bedtime before the wake-time (e.g. an atypical 01:00 -> 09:00 same-frame log) is
 *  asleep within that single span, no wraparound needed. */
function nightVector(bedMin: number, wakeMin: number): Uint8Array {
  const v = new Uint8Array(SRI_BINS_PER_DAY);
  for (let b = 0; b < SRI_BINS_PER_DAY; b++) {
    const mid = b * SRI_BIN_MIN + SRI_BIN_MIN / 2; // epoch midpoint, minutes since midnight
    const asleep = bedMin <= wakeMin ? mid >= bedMin && mid < wakeMin : mid >= bedMin || mid < wakeMin;
    v[b] = asleep ? 1 : 0;
  }
  return v;
}

/** Whole UTC days from day `a` to day `b` (YYYY-MM-DD) — same convention as retentionMetrics.ts. */
function diffCalendarDays(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Li et al. 2025 (Psychological Medicine, PMID 40814280, UK Biobank N=79,666, 7-day accelerometer +
 *  GGIR) quintile-derived cut-points. */
function sriBand(sri: number): SriBand {
  if (sri >= 71) return "regular";
  if (sri >= 52) return "moderately_irregular";
  return "irregular";
}

function sriGuidance(sri: number, band: SriBand): string {
  // Risk-strata hedge: Li et al. 2025's hazard ratios come from a 7-day wrist-accelerometer + GGIR
  // pipeline. Our reconstruction is a 2-point-per-night (bed/wake), possibly self-logged, approximation
  // with different measurement-error properties — presented as an evidence-informed directional band, NOT
  // diagnostic-grade equivalence.
  if (band === "regular") {
    return (
      `Your sleep timing has been steady night to night (SRI ${sri}/100). Research on objectively-measured ` +
      `sleep regularity links scores in this range to roughly 38% lower depression risk and 33% lower ` +
      `anxiety risk over several years (Li et al., 2025) — a directional signal from a different, larger ` +
      `population, not a diagnosis about you.`
    );
  }
  if (band === "moderately_irregular") {
    return (
      `Your sleep timing has been somewhat inconsistent (SRI ${sri}/100). Research on objectively-measured ` +
      `sleep regularity links scores in this range to a smaller but still real drop in depression/anxiety ` +
      `risk compared with irregular timing (Li et al., 2025) — steadying your bed and wake times further ` +
      `could help, worth holding gently rather than as a target to hit.`
    );
  }
  return (
    `Your sleep timing has been quite irregular night to night (SRI ${sri}/100). Research on ` +
    `objectively-measured sleep regularity links more regular timing to meaningfully lower depression and ` +
    `anxiety risk over time (Li et al., 2025) — a consistent wake time is usually the easiest lever to ` +
    `start with, not more hours.`
  );
}

/**
 * Compute the real Sleep Regularity Index from a reconstructed per-night bed/wake series (see
 * socialRhythm.ts's buildSleepWindows). Gate: >=MIN_SRI_NIGHTS distinct valid nights. Gap-tolerant: only
 * PAIRS of actually-consecutive calendar days are summed (Windred/`sleepreg` convention) — a missing night
 * breaks just that one pair rather than invalidating the whole window.
 *
 * Returns null when there isn't enough data — never a misleading number.
 */
export function computeSleepRegularityIndex(windows: SleepWindow[]): SleepRegularityResult | null {
  const sorted = [...(windows || [])]
    .filter((w) => w && typeof w.date === "string" && Number.isFinite(w.bedMin) && Number.isFinite(w.wakeMin))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < MIN_SRI_NIGHTS) return null;

  let matchSum = 0;
  let pairs = 0;
  const nightsInPairs = new Set<string>();
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (diffCalendarDays(a.date, b.date) !== 1) continue; // gap-tolerant: skip non-consecutive day pairs
    const va = nightVector(a.bedMin, a.wakeMin);
    const vb = nightVector(b.bedMin, b.wakeMin);
    let matches = 0;
    for (let j = 0; j < SRI_BINS_PER_DAY; j++) if (va[j] === vb[j]) matches++;
    matchSum += matches;
    pairs++;
    nightsInPairs.add(a.date);
    nightsInPairs.add(b.date);
  }

  if (pairs === 0) return null; // 7+ nights logged but none actually consecutive — can't judge timing yet

  const sri = Math.round(-100 + (200 * matchSum) / (SRI_BINS_PER_DAY * pairs));
  const band = sriBand(sri);
  return { sri, nightsUsed: nightsInPairs.size, pairsUsed: pairs, band, guidance: sriGuidance(sri, band) };
}

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

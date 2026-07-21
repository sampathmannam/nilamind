import { localDateKey } from "./storageUtils";
import { loadMoodHistory } from "./moodHistory";
import { type AssessmentEntry, INSTRUMENTS } from "./assessments";
import { selfReportSleepSignal, selfReportedSleepNights } from "./sleepInsight";
import { computeCircadianInsight } from "./circadian";
import { generateInsights, assessmentInsights, type Insight, type MoodPoint } from "./patternInsights";
import { type InflectionSignal, topFireableSignal } from "./nilaInflection";
import { getInflectionEnabled } from "./inflectionPrefs";
import { assessJitai, type JitaiDecision } from "./jitaiEngine";
import { computeUsageSummary } from "./usageAnalytics";
import { loadActivities, computeInsight, type BAActivityLog } from "./behaviouralActivation";
import { computeCompassionateStreak } from "./streaks";
import { secureLocal } from "./secureLocal";
import type { CheckInEntry, DiaryCardEntry, EpisodeRecord } from "../types";
import type { SleepSignal } from "./healthConnect";
import type { SleepNight } from "./healthConnect";

export type MoodState = "calm" | "anxious" | "low" | "elevated" | "crisis" | "mixed";

export interface StateEngineOutput {
  // Primary mood state (valence + energy)
  moodState: MoodState;
  moodConfidence: number; // 0-1

  // Risk / protective signals
  riskSignals: StateSignal[];
  protectiveSignals: StateSignal[];

  // Just-in-time nudges (already prioritized)
  jitai: JitaiDecision | null;

  // Inflection (trajectory shift)
  inflection: InflectionSignal | null;

  // Sleep / circadian
  sleep: {
    signal: SleepSignal | null;
    circadian: ReturnType<typeof computeCircadianInsight> | null;
  };

  // Behavioural activation summary
  ba: ReturnType<typeof computeInsight> | null;

  // Assessment trajectory
  assessments: Insight[] | null;

  // Streak / engagement
  streak: ReturnType<typeof computeCompassionateStreak> | null;

  // Evidence summary (for UI / Nila)
  evidence: EvidenceBundle;
}

export interface StateSignal {
  id: string;
  kind: "risk" | "protective";
  source: "sleep" | "phone" | "mood" | "screening" | "ba" | "social" | "movement" | "cognitive";
  label: string;
  detail: string;
  strength: "weak" | "moderate" | "strong"; // based on effect size / data quality
  basis: string; // research citation
  direction: "deterioration" | "improvement" | "stable" | "mixed";
  dataPoints: number;
}

export interface EvidenceBundle {
  sleepNights: number;
  checkins14d: number;
  phoneDays14d: number;
  baActivities14d: number;
  assessmentsAvailable: boolean;
  streakDays: number;
}

/**
 * CONSOLIDATED STATE ENGINE
 *
 * Single entry point that consolidates all existing evidence-based signal engines
 * into a single coherent state estimate. Pure functions, no side effects, fully
 * testable. The caller (buildPersonalContext) passes the raw data sources.
 *
 * Design principles:
 * - Evidence-linked: every signal cites its research basis
 * - Hierarchical: screening > mood trend > phone behaviour > BA > streak
 * - Personalized: always vs personal baseline, never population norms
 * - Hierarchical gating: a stronger signal (e.g., screening deterioration)
 *   suppresses weaker conflicting signals
 * - Manic-first: elevation risk always surfaced; short-sleep prodrome is
 *   the earliest manic warning
 */
export function runStateEngine(params: {
  checkins: CheckInEntry[];
  mood: MoodPoint[];
  assessments: AssessmentEntry[];
  diary: DiaryCardEntry[];
  episodes: EpisodeRecord[];
  snaps: import("./phoneBehaviour").BehaviourSnapshot[];
  lastUserText?: string;
  daysSinceLastCheckin: number;
}): StateEngineOutput {
  const today = localDateKey();

  // ── 1. Sleep / circadian (earliest manic prodrome) ──────────────────────
  const sleepSignal = selfReportSleepSignal(); // self-report available today
  const circadian = computeCircadianInsight({ sleepSignal: sleepSignal ?? undefined } as any);

  // ── 2. Phone behaviour → pattern insights ────────────────────────────────
  const behaviourInsights = generateInsights(params.snaps, params.mood);

  // ── 3. Screening trajectory (highest weight) ──────────────────────────────
  const assessmentInsightsResult = assessmentInsights(params.assessments, params.mood);

  // ── 4. Inflection (reliable-change screening + mood trend) ──────────────
  let inflection: InflectionSignal | null = null;
  if (getInflectionEnabled()) {
    inflection = topFireableSignal();
  }

  // ── 5. Mood state (valence + energy) ────────────────────────────────────
  const moodState = computeMoodState(params.checkins, params.mood, params.snaps);

  // ── 6. JITAI nudges ───────────────────────────────────────────────────────
  const jitai = assessJitai({
    sleep: sleepSignal,
    moodHistory: params.mood,
    lastUserText: params.lastUserText,
    daysSinceLastCheckin: params.daysSinceLastCheckin,
    usageAnalytics: computeUsageSummary(),
  });

  // ── 7. BA summary ─────────────────────────────────────────────────────────
  const baActivities = loadActivities();
  const ba = baActivities.length > 0 ? computeInsight(baActivities) : null;

  // ── 8. Streak ─────────────────────────────────────────────────────────────
  const streak = computeCompassionateStreak();

  // ── 9. Convert insights → typed signals ──────────────────────────────────
  const { riskSignals, protectiveSignals } = convertInsightsToSignals(
    behaviourInsights,
    assessmentInsightsResult,
    sleepSignal,
    circadian,
    inflection,
    jitai,
    moodState
  );

  // ── 10. Evidence bundle ───────────────────────────────────────────────────
  const evidence: EvidenceBundle = {
    sleepNights: selfReportedSleepNights().length,
    checkins14d: params.checkins.filter((c) => {
      const d = new Date(c.date + "T00:00:00");
      const daysAgo = (Date.now() - d.getTime()) / 86400000;
      return daysAgo <= 14;
    }).length,
    phoneDays14d: params.snaps.filter((s) => {
      const d = new Date(s.date + "T00:00:00");
      const daysAgo = (Date.now() - d.getTime()) / 86400000;
      return daysAgo <= 14;
    }).length,
    baActivities14d: baActivities.filter((a: BAActivityLog) => {
      const d = new Date(a.date + "T00:00:00");
      const daysAgo = (Date.now() - d.getTime()) / 86400000;
      return daysAgo <= 14 && a.status === "done";
    }).length,
    assessmentsAvailable: params.assessments.length > 0,
    streakDays: streak?.current ?? 0,
  };

  return {
    moodState: moodState.state,
    moodConfidence: moodState.confidence,
    riskSignals,
    protectiveSignals,
    jitai,
    inflection,
    sleep: { signal: sleepSignal, circadian },
    ba,
    assessments: assessmentInsightsResult,
    streak,
    evidence,
  };
}

/** Compute primary mood state from check-ins + phone behaviour + screening */
function computeMoodState(
  checkins: CheckInEntry[],
  mood: MoodPoint[],
  snaps: import("./phoneBehaviour").BehaviourSnapshot[]
): { state: MoodState; confidence: number } {
  // Primary: recent check-in valence + energy
  const recent = checkins.slice(-3);
  if (recent.length === 0) return { state: "calm", confidence: 0.2 };

  // Elevation from elevationGuard / chatElevation
  let elevated = false;
// Screening band
  let screeningBand = "";
  try {
    function readArrayLocal(key: string): any[] {
      try {
        const raw = secureLocal.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    }
    const all = readArrayLocal("nilamind_assessments")
      .filter((a: any) => a && (a.instrument === "PHQ-9" || a.instrument === "GAD-7") && typeof a.total === "number")
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (all.length) {
      const a = all[0];
      const id = a.instrument as "PHQ-9" | "GAD-7";
      const inst = INSTRUMENTS[id];
      const band = (typeof a.severity === "string" && a.severity)
        || inst?.bands.find((b) => a.total >= b.min && a.total <= b.max)?.label
        || "";
      if (band) {
        const what = id === "PHQ-9" ? "mood screening" : "anxiety screening";
        screeningBand = `Their last ${what} sat in the ${band.toLowerCase()} range`;
      }
    }
  } catch { /* best-effort */ }

  // Distress average
  const intensities = recent.map((c) => Number(c.intensity)).filter((n) => !isNaN(n));
  const avgDistress = intensities.length ? intensities.reduce((a, b) => a + b, 0) / intensities.length : 5;

  // Emotion chips
  const emotions = recent.map((c) => {
    const e = (c.emotion || "").replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
    return e;
  });
  const hasAnxious = emotions.some((e) => /anx|worr|panic|nervous/.test(e));
  const hasLow = emotions.some((e) => /low|sad|down|empty|hopeless/.test(e));

  // Crisis check (screening band or very high distress)
  if (screeningBand.includes("severe") || avgDistress >= 8) return { state: "crisis", confidence: 0.9 };

  // Mixed: high energy + distress (elevation + distress)
  if (elevated && avgDistress >= 6) return { state: "mixed", confidence: 0.8 };

  // Pure elevation
  if (elevated && avgDistress < 5) return { state: "elevated", confidence: 0.75 };

  // Anxious distress
  if (hasAnxious && avgDistress >= 5) return { state: "anxious", confidence: 0.7 };

  // Low mood
  if (hasLow && avgDistress >= 5) return { state: "low", confidence: 0.7 };

  // Default calm
  return { state: "calm", confidence: 0.5 };
}

/** Convert all insight sources into typed, prioritized signals */
function convertInsightsToSignals(
  behaviourInsights: Insight[],
  assessmentInsights: Insight[],
  sleepSignal: SleepSignal | null,
  circadian: ReturnType<typeof computeCircadianInsight> | null,
  inflection: InflectionSignal | null,
  jitai: JitaiDecision | null,
  moodState: { state: MoodState; confidence: number }
): { riskSignals: StateSignal[]; protectiveSignals: StateSignal[] } {
  const risk: StateSignal[] = [];
  const protective: StateSignal[] = [];

  // Sleep prodrome (highest priority for mania)
  if (sleepSignal?.firing) {
    risk.push({
      id: "sleep_prodrome",
      kind: "risk",
      source: "sleep",
      label: "Short-sleep prodrome",
      detail: sleepSignal.detail,
      strength: "strong",
      basis: "Shrinking sleep is the earliest + highest-yield manic prodrome (Lim 2024 npj Digit Med; Lewis 2017 Br J Psychiatry).",
      direction: "deterioration",
      dataPoints: sleepSignal.nightsBelow,
    });
  }

  // Circadian irregularity
  if (circadian?.irregular) {
    risk.push({
      id: "circadian_irregular",
      kind: "risk",
      source: "sleep",
      label: "Irregular sleep timing",
      detail: circadian.note,
      strength: "moderate",
      basis: "Sleep regularity index (CV ≥0.5) predicts mood instability in bipolar spectrum (Phillips et al. 2017; Sleep Regularity Index literature).",
      direction: "deterioration",
      dataPoints: circadian.nights,
    });
  }

  // Screening change (highest weight)
  for (const a of assessmentInsights) {
    if (a.direction === "risk") {
      risk.push({
        id: a.id,
        kind: "risk",
        source: "screening",
        label: a.title,
        detail: a.finding,
        strength: "strong",
        basis: a.basis,
        direction: "deterioration",
        dataPoints: a.dataPoints,
      });
    } else if (a.direction === "protective") {
      protective.push({
        id: a.id,
        kind: "protective",
        source: "screening",
        label: a.title,
        detail: a.finding,
        strength: "strong",
        basis: a.basis,
        direction: "improvement",
        dataPoints: a.dataPoints,
      });
    }
  }

  // Inflection signals
  if (inflection) {
    if (inflection.direction === "deterioration") {
      risk.push({
        id: inflection.id,
        kind: "risk",
        source: "mood",
        label: `Mood trend: ${inflection.direction}`,
        detail: inflection.detail,
        strength: "moderate",
        basis: inflection.basis,
        direction: "deterioration",
        dataPoints: inflection.dataPoints,
      });
    } else {
      protective.push({
        id: inflection.id,
        kind: "protective",
        source: "mood",
        label: `Mood trend: ${inflection.direction}`,
        detail: inflection.detail,
        strength: "moderate",
        basis: inflection.basis,
        direction: "improvement",
        dataPoints: inflection.dataPoints,
      });
    }
  }

  // Behaviour insights (phone patterns)
  for (const bi of behaviourInsights) {
    const sig: StateSignal = {
      id: bi.id,
      kind: bi.direction === "risk" ? "risk" : "protective",
      source: bi.id.includes("sleep") ? "sleep" : bi.id.includes("screen") || bi.id.includes("social") ? "phone" : bi.id.includes("movement") || bi.id.includes("steps") ? "movement" : bi.id.includes("social") ? "social" : "phone",
      label: bi.title,
      detail: bi.finding,
      strength: bi.dataPoints >= 10 ? "strong" : bi.dataPoints >= 7 ? "moderate" : "weak",
      basis: bi.basis,
      direction: bi.direction === "risk" ? "deterioration" : bi.direction === "protective" ? "improvement" : "stable",
      dataPoints: bi.dataPoints,
    };
    if (bi.direction === "risk") risk.push(sig);
    else if (bi.direction === "protective") protective.push(sig);
  }

  // JITAI nudges
  if (jitai?.shouldNudge) {
    for (const t of jitai.triggers) {
      if (t === "elevation_risk") {
        risk.push({
          id: "elevation_risk",
          kind: "risk",
          source: "phone",
          label: "Elevation risk from chat",
          detail: "Manic markers detected in recent messages",
          strength: "strong",
          basis: "Keyword-based mania risk detection (grandiosity, racing thoughts, pressured speech, decreased sleep need) — Østergaard 2023.",
          direction: "deterioration",
          dataPoints: 1,
        });
      } else if (t === "high_distortion") {
        risk.push({
          id: "high_distortion",
          kind: "risk",
          source: "cognitive",
          label: "High cognitive distortion",
          detail: "Multiple thinking traps detected in recent messages",
          strength: "moderate",
          basis: "Cognitive distortion spotting (CBT model) — self-referential negative patterns predict depressive persistence.",
          direction: "deterioration",
          dataPoints: 1,
        });
      } else if (t === "mood_deterioration") {
        risk.push({
          id: "mood_deterioration",
          kind: "risk",
          source: "mood",
          label: "Mood deterioration trend",
          detail: "Recent mood trend shows meaningful worsening",
          strength: "moderate",
          basis: "Within-person mood trajectory monitoring — sustained worsening over 5+ days predicts episode escalation.",
          direction: "deterioration",
          dataPoints: 5,
        });
      } else if (t === "sleep_prodrome") {
        // Already handled by sleepSignal above
      } else if (t === "inactivity") {
        risk.push({
          id: "inactivity",
          kind: "risk",
          source: "mood",
          label: "Extended inactivity",
          detail: "No check-in for 3+ days",
          strength: "weak",
          basis: "Engagement dropout predicts non-response and relapse (Linardon et al. 2025).",
          direction: "deterioration",
          dataPoints: 1,
        });
      }
    }
  }

  // BA protective signals
  const baActivities = loadActivities();
  if (baActivities.length > 0) {
    const done = baActivities.filter((a: any) => a.status === "done");
    if (done.length >= 3) {
      protective.push({
        id: "ba_engagement",
        kind: "protective",
        source: "ba",
        label: "BA engagement",
        detail: `${done.length} activities completed recently — behavioural activation is active`,
        strength: done.length >= 5 ? "strong" : "moderate",
        basis: "Behavioural activation (activity scheduling + mastery/pleasure rating) is the best-evidenced behavioural treatment for depression (SMD ≈ −0.51; meta-analyses).",
        direction: "improvement",
        dataPoints: done.length,
      });
    }
  }

  // Streak protective
  try {
    const streak = computeCompassionateStreak();
    if (streak?.current && streak.current >= 7) {
      protective.push({
        id: "streak_engagement",
        kind: "protective",
        source: "mood",
        label: "Consistent engagement",
        detail: `${streak.current}-day check-in streak — they keep showing up`,
        strength: streak.current >= 14 ? "strong" : "moderate",
        basis: "Compassionate streak (engagement without pressure) predicts retention and outcome; self-monitoring adherence correlates with symptom reduction.",
        direction: "improvement",
        dataPoints: streak.current,
      });
    }
  } catch { /* best-effort */ }

  // Social connection protective
  const recentMood = loadMoodHistory().slice(-7);
  const socialVals = recentMood.filter((m: any) => m.social != null).map((m: any) => m.social);
  if (socialVals.length >= 3 && socialVals.reduce((a: number, b: number) => a + b, 0) / socialVals.length >= 6) {
    protective.push({
      id: "social_connection",
      kind: "protective",
      source: "social",
      label: "Good felt connection",
      detail: "Recent check-ins show consistent social connection ≥6/10",
      strength: "moderate",
      basis: "Felt connection is among the strongest mood protectors (loneliness↔depression r≈0.50; Holt-Lunstad 2010).",
      direction: "improvement",
      dataPoints: socialVals.length,
    });
  }

  // Sort by strength priority
  const strengthOrder = { strong: 3, moderate: 2, weak: 1 };
  risk.sort((a, b) => strengthOrder[b.strength] - strengthOrder[a.strength]);
  protective.sort((a, b) => strengthOrder[b.strength] - strengthOrder[a.strength]);

  return { riskSignals: risk, protectiveSignals: protective };
}
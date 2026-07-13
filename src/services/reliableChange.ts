/**
 * Reliable Change Index + Clinically Significant Change
 *
 * Jacobson-Truax (1991) method for outcome monitoring in measurement-based care.
 * Lambert et al. 2003 meta (N≈6 000) showed feedback improves outcomes d≈0.24,
 * rising to d≈0.70 for non-responding patients when deterioration is flagged early.
 *
 * Every RCI threshold uses the published test-retest reliability from the instrument's
 * validation paper. The cut-point for CSC is the validated screening threshold (≥10 for
 * PHQ-9/GAD-7, ≥50 for WHO-5 = wellbeing, where crossing upward is recovery).
 */
import type { InstrumentId } from "./assessments";
import type { AssessmentEntry } from "./assessments";

/* ── Psychometric parameters for each instrument ────────────────── */
export interface Psychometrics {
  testRetest: number;   // Pearson r
  sd: number;           // published SD in clinical sample
  cutPoint: number;     // screening threshold (the CSC recovery boundary)
  higherIsBetter: boolean; // true = WHO-5 (higher = healthier)
}

const PSYCHOMETRICS: Record<InstrumentId, Psychometrics> = {
  "PHQ-9":  { testRetest: 0.89, sd: 6.4,  cutPoint: 10, higherIsBetter: false },
  "PHQ-2":  { testRetest: 0.83, sd: 1.8,  cutPoint: 3,  higherIsBetter: false },
  "GAD-7":  { testRetest: 0.83, sd: 5.1,  cutPoint: 10, higherIsBetter: false },
  "WHO-5":  { testRetest: 0.87, sd: 18.5, cutPoint: 50, higherIsBetter: true },
  "PSS-4":  { testRetest: 0.72, sd: 3.1,  cutPoint: 6,  higherIsBetter: false },
  "ASRM":   { testRetest: 0.86, sd: 5.0,  cutPoint: 6,  higherIsBetter: false },
};

function sem(p: Psychometrics): number {
  return p.sd * Math.sqrt(1 - p.testRetest);
}

function sDiff(p: Psychometrics): number {
  return Math.sqrt(2 * sem(p) * sem(p));
}

/** The threshold (in raw score points) that a difference must exceed to be reliable at p<0.05. */
export function reliableChangeThreshold(instrument: InstrumentId): number {
  const p = PSYCHOMETRICS[instrument];
  if (!p) throw new Error(`Unknown instrument: ${instrument}`);
  return 1.96 * sDiff(p);
}

/* ── Outcome classifications ────────────────────────────────────── */

export type TrendDirection = "reliably_improved" | "reliably_deteriorated" | "no_reliable_change";
export type RecoveryStatus = "recovered" | "not_recovered";

export interface OutcomeChange {
  priorTotal: number;
  currentTotal: number;
  difference: number;
  rci: number;
  threshold: number;
  trend: TrendDirection;
}

export interface OutcomeStatus {
  current: OutcomeChange | null;  // null when only one measurement exists
  recovery: RecoveryStatus | null;
  trajectory: TrendDirection | "stable"; // overall across all measurements
  history: { date: string; total: number }[];
}

/**
 * Compute the cross-sectional change between the two most recent measurements.
 */
export function computeReliableChange(
  prior: AssessmentEntry,
  current: AssessmentEntry,
  instrument: InstrumentId,
): OutcomeChange {
  const p = PSYCHOMETRICS[instrument];
  const diff = current.total - prior.total;
  const threshold = reliableChangeThreshold(instrument);
  const rci = diff / sDiff(p);
  const absRci = Math.abs(rci);
  const trend: TrendDirection =
    absRci < 1.96 ? "no_reliable_change"
    : diff < 0 && !p.higherIsBetter ? "reliably_improved"
    : diff > 0 && p.higherIsBetter ? "reliably_improved"
    : diff > 0 && !p.higherIsBetter ? "reliably_deteriorated"
    : "reliably_deteriorated";
  return { priorTotal: prior.total, currentTotal: current.total, difference: diff, rci, threshold, trend };
}

/**
 * Full outcome status for an instrument: latest change + recovery + trajectory.
 */
export function outcomeStatus(
  instrument: InstrumentId,
  all: AssessmentEntry[],
): OutcomeStatus {
  const p = PSYCHOMETRICS[instrument];
  const entries = all
    .filter((e) => e.instrument === instrument)
    .sort((a, b) => a.date.localeCompare(b.date) || a.timestamp.localeCompare(b.timestamp));
  const history = entries.map((e) => ({ date: e.date, total: e.total }));
  if (entries.length < 2) {
    return { current: null, recovery: null, trajectory: "stable", history };
  }
  const current = computeReliableChange(entries[entries.length - 2], entries[entries.length - 1], instrument);
  const recov = classifyRecovery(instrument, entries, p);
  const trajectory = overallTrajectory(entries, instrument);
  return { current, recovery: recov, trajectory, history };
}

/**
 * Jacobson-Truax clinically significant change:
 *   recovered  = reliably improved AND crossed the cut-point
 *   not_recovered = did cross but without reliable improvement, or haven't crossed
 */
function classifyRecovery(
  instrument: InstrumentId,
  entries: AssessmentEntry[],
  p: Psychometrics,
): RecoveryStatus | null {
  if (entries.length < 2) return null;
  const first = entries[0].total;
  const last  = entries[entries.length - 1].total;
  const change = computeReliableChange(entries[0], entries[entries.length - 1], instrument);
  if (change.trend !== "reliably_improved") return "not_recovered";
  const crossed = p.higherIsBetter
    ? (first < p.cutPoint && last >= p.cutPoint)
    : (first >= p.cutPoint && last < p.cutPoint);
  return crossed ? "recovered" : "not_recovered";
}

/** Overall trajectory: reliable improvement, deterioration, or stable across the full series. */
function overallTrajectory(
  entries: AssessmentEntry[],
  instrument: InstrumentId,
): OutcomeStatus["trajectory"] {
  if (entries.length < 3) return "stable";
  const first = entries[0].total;
  const last  = entries[entries.length - 1].total;
  const change = computeReliableChange(entries[0], entries[entries.length - 1], instrument);
  if (change.trend === "reliably_improved") return "reliably_improved";
  if (change.trend === "reliably_deteriorated") return "reliably_deteriorated";
  return "stable";
}

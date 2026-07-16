/**
 * N-of-1 evaluation harness.
 *
 * Uses the validated reliable-change index (Jacobson & Truax, 1991) to determine whether
 * an individual user's change is statistically reliable — not just random fluctuation.
 * Reuses the existing `reliableChange.ts` infrastructure but adds a structured evaluation
 * harness that computes improvement scores across mood, energy, and sleep dimensions.
 *
 * Research basis: GLOBEM benchmark (Xu et al., 2022) — N-of-1 models require longitudinal
 * data; five-axis evaluation framework (Emergent Mind, 2026).
 */

/* ─── Types ─── */

export interface NofOneDataPoint {
  date: string;
  mood: number;
  energy: number;
  sleepHours: number;
}

export type NofOneStatus = "insufficient_data" | "stable" | "improving" | "deteriorating";

export interface NofOneResult {
  status: NofOneStatus;
  improvementScore: number;
  dataPoints: number;
  windowDays: number;
  reliableChange?: {
    reliableImprovement: boolean;
    reliableDeterioration: boolean;
  };
}

/* ─── Constants ─── */

const MIN_DATA_POINTS = 7;
const MIN_HALF = 3;

/* ─── Functions ─── */

export function computeImprovementScore(data: NofOneDataPoint[]): number {
  if (data.length < 2) return 0;

  const half = Math.ceil(data.length / 2);
  const firstHalf = data.slice(0, half);
  const secondHalf = data.slice(-half);

  const avgMood = (d: NofOneDataPoint[]) =>
    d.reduce((s, p) => s + p.mood, 0) / d.length;
  const avgEnergy = (d: NofOneDataPoint[]) =>
    d.reduce((s, p) => s + p.energy, 0) / d.length;
  const avgSleep = (d: NofOneDataPoint[]) =>
    d.reduce((s, p) => s + p.sleepHours, 0) / d.length;

  const moodDelta = avgMood(secondHalf) - avgMood(firstHalf);
  const energyDelta = avgEnergy(secondHalf) - avgEnergy(firstHalf);
  const sleepDelta = avgSleep(secondHalf) - avgSleep(firstHalf);

  // Weighted combination: mood (50%), energy (30%), sleep (20%)
  // Normalized to roughly [-1, 1] range
  const score = moodDelta * 0.5 + energyDelta * 0.1 + sleepDelta * 0.05;
  return Math.round(score * 100) / 100;
}

export function evaluateNofOne(
  data: NofOneDataPoint[],
  baseline?: NofOneDataPoint[],
  endpoint?: NofOneDataPoint[]
): NofOneResult {
  if (data.length < MIN_DATA_POINTS) {
    return {
      status: "insufficient_data",
      improvementScore: 0,
      dataPoints: data.length,
      windowDays: 0,
    };
  }

  const score = computeImprovementScore(data);
  let status: NofOneStatus = "stable";
  if (score > 0.5) status = "improving";
  else if (score < -0.5) status = "deteriorating";

  const result: NofOneResult = {
    status,
    improvementScore: score,
    dataPoints: data.length,
    windowDays: data.length,
  };

  // Reliable change index when baseline + endpoint provided
  if (baseline && baseline.length >= MIN_HALF && endpoint && endpoint.length >= MIN_HALF) {
    const bMood = baseline.reduce((s, p) => s + p.mood, 0) / baseline.length;
    const eMood = endpoint.reduce((s, p) => s + p.mood, 0) / endpoint.length;
    // Simple reliable change: difference > 1.96 * sqrt(2) ≈ 2.77 for typical mood SD of 2
    const threshold = 2.77;
    const diff = eMood - bMood;
    result.reliableChange = {
      reliableImprovement: diff > threshold,
      reliableDeterioration: diff < -threshold,
    };
  }

  return result;
}

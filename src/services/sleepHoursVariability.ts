/**
 * Sleep hours variability — circadian regularity signal (C1).
 *
 * Irregular sleep timing (even with adequate total hours) is a documented
 * prodrome signal in bipolar. This pure function detects high sleep-hours
 * variability as a proxy for circadian disruption. Soft-signal nudge only
 * — never an alarm, never sleep-restriction advice (mania risk).
 *
 * 🟡 FLAG: sleep sensing — review diff before merge.
 */
import type { SleepNight } from "./healthConnect";

export interface VariabilitySignal {
  firing: boolean;
  stdDev: number;
  mean: number;
  detail: string;
}

const MIN_NIGHTS = 7; // need at least a week to assess regularity
const VARIABILITY_THRESHOLD = 1.5; // std dev > 1.5h = irregular

/** Standard deviation (population formula — consistent with stats libraries). */
function stdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const sqDiffs = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return Math.sqrt(sqDiffs / values.length);
}

/**
 * Detects high sleep-hours variability as a proxy for circadian irregularity.
 * Returns null when fewer than MIN_NIGHTS of data (cold-start).
 */
export function sleepHoursVariability(nights: SleepNight[]): VariabilitySignal | null {
  const sorted = [...(nights || [])]
    .filter((n) => Number.isFinite(n?.hours) && n.hours > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < MIN_NIGHTS) return null;

  const hours = sorted.map((n) => n.hours);
  const mean = hours.reduce((s, h) => s + h, 0) / hours.length;
  const sd = stdDev(hours, mean);
  const firing = sd > VARIABILITY_THRESHOLD;

  const detail = firing
    ? `Sleep hours vary by about ${sd.toFixed(1)}h night to night (average ${mean.toFixed(1)}h). ` +
      `High night-to-night variability can sometimes come before mood shifts — worth holding gently, not a diagnosis.`
    : `Sleep hours are fairly steady (variability ${sd.toFixed(1)}h, average ${mean.toFixed(1)}h).`;

  return { firing, stdDev: sd, mean, detail };
}

/**
 * Generates a gentle context block for Nila's system prompt when sleep variability is high.
 * Returns "" when signal is null or not firing. Never recommends sleep restriction.
 */
export function variabilityContextBlock(sig: VariabilitySignal | null): string {
  if (!sig?.firing) return "";

  return [
    `SLEEP REGULARITY (hold gently — this is a soft signal, never a diagnosis)`,
    `Their self-logged sleep hours have been varying quite a bit night to night`,
    `(about ${sig.stdDev.toFixed(1)}h, averaging ${sig.mean.toFixed(1)}h). For some people`,
    `irregular sleep timing can come before mood shifts. If it feels natural, you can`,
    `gently ask how their sleep has been — not "are you sleeping well?" but more like`,
    `"how has your rest felt lately?" or "has your sleep rhythm been steady?"`,
    `Never frame sleep as something for them to control or fix — no rules, no`,
    `prescriptions, no targets. The goal is steady rhythm, not more hours.`,
  ].join(" ");
}

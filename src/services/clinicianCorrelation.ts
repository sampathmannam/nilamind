// Phase 20.4 — Pure deterministic correlations for the clinician PDF.
// These are math-only: no labels, no clinical language, paired with sample size.
// Each correlation is a Pearson r (or frequency count) — the clinician decides
// what the number means.

/**
 * Paired daily data point for sleep→intensity correlation.
 */
export interface SleepIntensityPoint {
  date: string;
  sleepHours: number;
  intensity: number;
}

export interface SleepIntensityCorrelation {
  /** Pearson r: negative = less sleep correlates with more distress. Range [-1, 1]. */
  correlation: number;
  /** Number of paired data points used. */
  sampleSize: number;
}

/**
 * PURE. Compute Pearson correlation between sleep hours and next-day intensity.
 *
 * Research basis: IPSRT 2024 (Frank 2005); Littlewood 2016; Schatten 2022.
 * Sleep disturbance → next-day distress is the most-cited temporal relationship
 * in bipolar EMA studies. The clinician gets one number (r) with sample size (n).
 *
 * @param points Array of paired daily {sleepHours, intensity} values.
 *               Caller is responsible for pairing day i's sleep with day i+1's intensity.
 *               If the caller passes same-day values, that's also acceptable (the correlation
 *               still tells the clinician whether sleep and mood co-vary).
 */
export function computeSleepIntensityCorrelation(
  points: SleepIntensityPoint[],
): SleepIntensityCorrelation | null {
  const n = points.length;
  if (n < 3) return null;

  const xs = points.map((p) => p.sleepHours);
  const ys = points.map((p) => p.intensity);

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  const varianceX = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  const varianceY = ys.reduce((sum, y) => sum + (y - meanY) ** 2, 0);

  if (varianceX === 0 || varianceY === 0) return null; // no variance → r undefined

  const covariance = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
  const r = covariance / Math.sqrt(varianceX * varianceY);

  return {
    correlation: Math.round(r * 100) / 100,
    sampleSize: n,
  };
}

/**
 * Episode trigger/context distribution for the clinician PDF.
 */
export interface TriggerFrequency {
  theme: string;
  count: number;
}

export interface ContextFrequency {
  context: string;
  count: number;
}

export interface ClinicianTriggerDistribution {
  topTriggers: TriggerFrequency[];
  topContexts: ContextFrequency[];
}

/**
 * PURE. Summarise the frequency distribution of episode triggers and contexts.
 *
 * The clinician gets the top 5 trigger themes (first 1-2 words) and top 3 contexts
 * ranked by frequency. This replaces the patient trying to remember "what sets me off"
 * in the consult room.
 *
 * @param episodes Array of {trigger, context} from episode records.
 */
export function computeTriggerContextDistribution(
  episodes: Array<{ trigger: string | null; context?: string }>,
): ClinicianTriggerDistribution {
  if (!episodes || episodes.length === 0) {
    return { topTriggers: [], topContexts: [] };
  }

  // Trigger themes: first 1-2 words of each trigger.
  const triggerCounts: Record<string, number> = {};
  for (const ep of episodes) {
    if (!ep.trigger) continue;
    const words = ep.trigger.trim().split(/\s+/);
    const theme = words.slice(0, 2).join(" ");
    if (theme) triggerCounts[theme] = (triggerCounts[theme] || 0) + 1;
  }
  const topTriggers = Object.entries(triggerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([theme, count]) => ({ theme, count }));

  // Context frequency.
  const contextCounts: Record<string, number> = {};
  for (const ep of episodes) {
    if (!ep.context) continue;
    contextCounts[ep.context] = (contextCounts[ep.context] || 0) + 1;
  }
  const topContexts = Object.entries(contextCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([context, count]) => ({ context, count }));

  return { topTriggers, topContexts };
}

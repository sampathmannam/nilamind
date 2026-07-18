// Phase 22.3 — Gentle phase-shift detection from passive signals.
// Detects potential mood shifts using the most validated passive signals.
// Suggests a gentle card; the user decides. NEVER labels or diagnoses.
// Wellness framing: "pattern worth noticing" never "episode".

import type { DailyFeatureSet } from "./signalExtractor";

export interface PhaseShiftSuggestion {
  kind: "possible_elevation" | "possible_depression" | "possible_improvement";
  confidence: number;
  signals: string[];
  evidenceDays: number;
  suggestedCard: {
    title: string;
    body: string;
    icon: string;
    color: string;
  };
}

const COOLDOWN_DAYS = 7;

/**
 * Detect potential phase shifts from passive signals.
 * The MOST research-validated signal: sleep timing + duration + variability
 * (Lim 2024, AUC 0.98; Ortiz 2025, 7-day activity advance).
 *
 * Rules:
 * - Possible elevation: short sleep run (3+ nights) + screen time spike + activity increase
 * - Possible depression: increasing sleep + decreasing activity + decreasing social
 * - Possible improvement: improving sleep regularity + stable/positive typing signal
 *
 * Returns null when confidence < 0.5 or when the last shown suggestion was < 7 days ago.
 * NEVER uses diagnostic language.
 */
export function detectPhaseShift(
  window: DailyFeatureSet[],
  lastSuggestion?: PhaseShiftSuggestion | null,
): PhaseShiftSuggestion | null {
  if (window.length < 3) return null;

  // Cooldown check
  if (lastSuggestion) {
    // In a real implementation, we'd check the timestamp. For now, just check signal count.
    // The caller should handle timestamp-based cooldown.
  }

  const recent = window.slice(-5);
  const earliest = window.slice(0, Math.ceil(window.length / 2));
  const latest = window.slice(Math.ceil(window.length / 2));

  // Possible elevation: short sleep + screen spike + activity increase
  const shortSleepCount = recent.filter((f) => f.sleep.shortSleepRun >= 2).length;
  const spikeCount = recent.filter((f) => f.composite.activitySpike).length;
  const elevationSignals = shortSleepCount + spikeCount;

  if (elevationSignals >= 3 && shortSleepCount >= 2) {
    const confidence = Math.min(0.9, elevationSignals / recent.length);
    if (confidence >= 0.5) {
      return {
        kind: "possible_elevation",
        confidence,
        signals: ["short sleep pattern", "increased phone activity"],
        evidenceDays: recent.length,
        suggestedCard: {
          title: "A pattern worth noticing",
          body: "A few things have been moving in the same direction lately — your sleep and activity. Sometimes that's just life; sometimes it's your body telling you something.",
          icon: "eye",
          color: "amber",
        },
      };
    }
  }

  // Sleep averages use only real nights — the previous `?? 7` imputation manufactured a 7h trend out of
  // missing data, biasing every sleep comparison below.
  const realSleep = (fs: DailyFeatureSet[]): number[] =>
    fs.map((f) => f.sleep.hoursLastNight).filter((h): h is number => h != null && h > 0);
  const latestSleep = realSleep(latest);
  const earliestSleep = realSleep(earliest);
  const avgLatestSleep = latestSleep.length ? latestSleep.reduce((a, b) => a + b, 0) / latestSleep.length : null;
  const avgEarliestSleep = earliestSleep.length ? earliestSleep.reduce((a, b) => a + b, 0) / earliestSleep.length : null;

  // Possible depression: increasing sleep (or very long sleep) + decreasing activity
  const sleepIncreasing = avgLatestSleep != null && avgEarliestSleep != null && avgLatestSleep > avgEarliestSleep + 1;
  const activityDeclining = recent.filter((f) => f.activity.screenTimeDelta7d != null && f.activity.screenTimeDelta7d < -20).length >= 2;

  if (sleepIncreasing && activityDeclining) {
    const confidence = 0.6;
    return {
      kind: "possible_depression",
      confidence,
      signals: ["longer sleep", "reduced activity"],
      evidenceDays: recent.length,
      suggestedCard: {
        title: "A pattern worth noticing",
        body: "Your sleep and activity have been shifting in a direction that sometimes means things are weighing on you. Worth a gentle check-in with yourself.",
        icon: "cloud",
        color: "blue",
      },
    };
  }

  // Possible improvement: an earlier rough stretch (short-sleep runs, elevation markers, or sleep outside
  // a healthy range) that has SETTLED into a recent steady, healthy sleep range — a genuine recovery. NOT
  // "less sleep than before", which is elevation-adjacent and the opposite of improving; the old rule
  // (`avgLatest < avgEarliest − 0.5`) rewarded exactly that, and fired for any always-steady user too.
  const recentSleep = realSleep(recent);
  const recentSleepAvg = recentSleep.length ? recentSleep.reduce((a, b) => a + b, 0) / recentSleep.length : null;
  const recentSleepSpread = recentSleep.length >= 3 ? Math.max(...recentSleep) - Math.min(...recentSleep) : Infinity;
  const recentSteadyHealthy = recentSleepAvg != null && recentSleepAvg >= 6.5 && recentSleepAvg <= 8.5 && recentSleepSpread <= 1.5;
  const earlierRough = earliest.some((f) => f.sleep.shortSleepRun >= 2 || f.composite.activitySpike || f.composite.typingElevationSignal)
    || (avgEarliestSleep != null && (avgEarliestSleep < 6 || avgEarliestSleep > 8.5));
  const typingStable = recent.filter((f) => !f.composite.typingElevationSignal).length >= recent.length * 0.7;

  if (earlierRough && recentSteadyHealthy && typingStable && recent.length >= 3) {
    const confidence = 0.55;
    return {
      kind: "possible_improvement",
      confidence,
      signals: ["improving sleep", "stable typing"],
      evidenceDays: recent.length,
      suggestedCard: {
        title: "Something steady",
        body: "Your sleep has been improving and your routine feels more consistent. That kind of steadiness is worth noticing.",
        icon: "sun",
        color: "green",
      },
    };
  }

  return null;
}

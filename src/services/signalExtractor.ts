// Phase 21.1 — Pure feature extraction from existing stores.
// Reads from moodHistory, phoneBehaviour, typingPatterns, autoAnchors, socialRhythm,
// circadianFeedback, healthConnect. Produces a typed DailyFeatureSet for a given day.
// No side effects — reads only. The bridge between raw sensing and compound analysis.

import { secureLocal } from "./secureLocal";
import { DAY_MS, localDateKey } from "./storageUtils";

export interface DailyFeatureSet {
  date: string;
  sleep: {
    hoursLastNight: number | null;
    sleepRegularityIndex: number | null;
    sleepCv: number | null;
    shortSleepRun: number;
    bedTimeVariabilityMin: number | null;
  };
  activity: {
    screenTimeMinutes: number | null;
    screenTimeDelta7d: number | null;
    socialAppMinutes: number | null;
    unlockCount: number | null;
  };
  circadian: {
    firstOpenTime: string | null;
    lastCloseTime: string | null;
    rhythmRegularityScore: number | null;
  };
  typing: {
    avgTypingSpeed: number | null;
    avgPauseDuration: number | null;
    burstCount: number | null;
    moodSignal: "mania" | "depression" | "anxiety" | null;
  };
  heartRate: {
    restingHr: number | null;
    hrVariability: number | null;
  };
  composite: {
    activitySpike: boolean;
    circadianDisruption: boolean;
    typingElevationSignal: boolean;
    sleepActivityConcordance: boolean;
  };
}

function readArray(key: string): unknown[] {
  try {
    const raw = secureLocal.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readObject(key: string): Record<string, unknown> | null {
  try {
    const raw = secureLocal.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Local-day key, matching the rest of the app (streaks, check-ins, med logs). Was toISOString().split
// (UTC), which in IST shifted every extracted feature's date back a day between 00:00–05:30 local.
function dateKey(d: Date): string {
  return localDateKey(d);
}

/** Extract sleep hours from moodHistory for a given date. */
function extractSleepHours(targetDate: string): number | null {
  const history = readArray("nilamind_mood_history");
  for (const entry of history) {
    const e = entry as Record<string, unknown>;
    if (e.date === targetDate && typeof e.sleepHours === "number" && e.sleepHours > 0) {
      return e.sleepHours;
    }
  }
  return null;
}

/** Compute sleep CV from the last N nights. */
function computeSleepCv(nights: (number | null)[]): number | null {
  const valid = nights.filter((n): n is number => n != null && n > 0);
  if (valid.length < 3) return null;
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  if (mean === 0) return null;
  const variance = valid.reduce((a, b) => a + (b - mean) ** 2, 0) / valid.length;
  return Math.sqrt(variance) / mean;
}

/** Count consecutive nights below a baseline. */
function computeShortSleepRun(targetDate: string, baselineHours: number | null): number {
  const baseline = baselineHours ?? 7;
  let run = 0;
  const d = new Date(targetDate + "T12:00:00");
  for (let i = 0; i < 14; i++) {
    const dk = dateKey(d);
    const hours = extractSleepHours(dk);
    if (hours != null && hours < baseline) {
      run++;
    } else if (hours != null) {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return run;
}

/** Extract activity features from phoneBehaviour snapshots. */
function extractActivity(targetDate: string): DailyFeatureSet["activity"] {
  const snaps = readArray("nilamind_phone_behaviour") as Array<Record<string, unknown>>;
  const todaySnap = snaps.find((s) => s?.date === targetDate);
  const screenTimeMinutes = typeof todaySnap?.screenTimeMinutes === "number" ? todaySnap.screenTimeMinutes : null;
  const unlockCount = typeof todaySnap?.unlockCount === "number" ? todaySnap.unlockCount : null;
  const socialAppMinutes = typeof todaySnap?.socialAppMinutes === "number" ? todaySnap.socialAppMinutes : null;

  // Compute 7-day average for delta
  const recentSnaps = snaps.filter((s: any) => {
    if (!s?.date) return false;
    const d = new Date(s.date);
    const target = new Date(targetDate);
    const diff = (target.getTime() - d.getTime()) / DAY_MS;
    return diff >= 1 && diff <= 7; // the 7 days BEFORE the target — exclude the target day itself
  });
  const avg7d = recentSnaps.length > 0
    ? recentSnaps.reduce((a: number, s: any) => a + (s.screenTimeMinutes ?? 0), 0) / recentSnaps.length
    : null;
  const screenTimeDelta7d = screenTimeMinutes != null && avg7d != null
    ? screenTimeMinutes - avg7d
    : null;

  return { screenTimeMinutes, screenTimeDelta7d, socialAppMinutes, unlockCount };
}

/** Extract circadian features from autoAnchors. */
function extractCircadian(targetDate: string): DailyFeatureSet["circadian"] {
  const anchors = readObject("nilamind_auto_anchors") as Record<string, { firstOpen?: string; lastClose?: string }> | null;
  const dayAnchors = anchors?.[targetDate];
  const firstOpenTime = dayAnchors?.firstOpen ?? null;
  const lastCloseTime = dayAnchors?.lastClose ?? null;

  // Rhythm regularity from social rhythm
  let rhythmRegularityScore: number | null = null;
  try {
    // Import is avoided to keep this module pure — read directly from store
    const rhythmData = readArray("nilamind_social_rhythm");
    if (rhythmData.length >= 3) {
      // Simple regularity: count of days with all 5 anchors present
      const complete = rhythmData.filter((r: any) =>
        r?.wake && r?.firstContact && r?.startActivity && r?.dinner && r?.bed
      ).length;
      rhythmRegularityScore = Math.round((complete / rhythmData.length) * 100);
    }
  } catch { /* best-effort */ }

  return { firstOpenTime, lastCloseTime, rhythmRegularityScore };
}

/** Extract typing features from typingPatterns store. */
function extractTyping(): DailyFeatureSet["typing"] {
  const data = readObject("nilamind_typing_patterns") as Record<string, unknown> | null;
  return {
    avgTypingSpeed: (data?.avgTypingSpeed as number) ?? null,
    avgPauseDuration: (data?.avgPauseDuration as number) ?? null,
    burstCount: (data?.burstCount as number) ?? null,
    moodSignal: (data?.moodSignal as "mania" | "depression" | "anxiety") ?? null,
  };
}

/** Extract heart rate features (placeholder for future Health Connect wiring). */
function extractHeartRate(): DailyFeatureSet["heartRate"] {
  const data = readObject("nilamind_heart_rate") as Record<string, unknown> | null;
  return {
    restingHr: (data?.restingHr as number) ?? null,
    hrVariability: (data?.hrVariability as number) ?? null,
  };
}

/** Compute composite boolean flags from raw features. */
export function computeComposites(features: Omit<DailyFeatureSet, "composite" | "date">): DailyFeatureSet["composite"] {
  // Activity spike: screen time > 150% of the 7-day baseline (the comment always said 150%, but the code
  // was `delta > 0` — i.e. any above-average day, ~half of all days by chance). avg = today − delta.
  const screenToday = features.activity.screenTimeMinutes;
  const screenDelta = features.activity.screenTimeDelta7d;
  const avg7d = screenToday != null && screenDelta != null ? screenToday - screenDelta : null;
  const activitySpike = screenToday != null && avg7d != null && avg7d > 0 && screenToday > 1.5 * avg7d;

  // Circadian disruption: only meaningful once real anchor data exists. Missing anchors are INSUFFICIENT
  // DATA, not disruption — the old `any null anchor` flagged every anchor-less user as disrupted daily,
  // firing "Routine disruption" and forcing an `elevated` mood state for everyone. Deviation-from-median
  // detection is not implemented yet, so with data present we do not (yet) assert disruption.
  const circadianDisruption = false;

  // Typing elevation signal
  const typingElevationSignal = features.typing.moodSignal === "mania";

  // Sleep-activity concordance: short sleep AND a real activity spike (same 150% bar as activitySpike,
  // not merely any above-average day) moving together.
  const sleepActivityConcordance = features.sleep.shortSleepRun > 0 && activitySpike;

  return { activitySpike, circadianDisruption, typingElevationSignal, sleepActivityConcordance };
}

/** Extract all features for a given date. Pure — reads from existing stores. */
export function extractAllFeatures(targetDate: string): DailyFeatureSet {
  const sleepHours = extractSleepHours(targetDate);
  const shortSleepRun = computeShortSleepRun(targetDate, null);
  const activity = extractActivity(targetDate);
  const circadian = extractCircadian(targetDate);
  const typing = extractTyping();
  const heartRate = extractHeartRate();

  // Sleep CV from 7-day window
  const sleepNights: (number | null)[] = [];
  const d = new Date(targetDate + "T12:00:00");
  for (let i = 0; i < 7; i++) {
    sleepNights.push(extractSleepHours(dateKey(d)));
    d.setDate(d.getDate() - 1);
  }
  const sleepCv = computeSleepCv(sleepNights);

  const features = {
    sleep: {
      hoursLastNight: sleepHours,
      sleepRegularityIndex: null, // computed externally from Health Connect
      sleepCv,
      shortSleepRun,
      bedTimeVariabilityMin: null, // computed externally from Health Connect
    },
    activity,
    circadian,
    typing,
    heartRate,
  };

  return {
    date: targetDate,
    ...features,
    composite: computeComposites(features),
  };
}

/** Extract features for today. */
export function extractTodayFeatures(): DailyFeatureSet {
  return extractAllFeatures(dateKey(new Date()));
}

/** Build a rolling feature window ending at `date`. */
export function extractFeatureWindow(endDate: string, days: number): DailyFeatureSet[] {
  const window: DailyFeatureSet[] = [];
  const d = new Date(endDate + "T12:00:00");
  for (let i = 0; i < days; i++) {
    window.push(extractAllFeatures(dateKey(d)));
    d.setDate(d.getDate() - 1);
  }
  return window.reverse(); // oldest first
}

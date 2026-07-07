// State Digest — consolidates existing insight engines into a single typed state estimate.
// Pure functions, zero network, no AI. Feeds into buildPersonalContext() so Nila has a unified
// view of the user's current state across all signals. Does NOT rebuild any engine — just
// orchestrates calls to patternInsights, nilaInflection, sleepInsight, behaviouralActivation.

import { secureLocal } from "./secureLocal";
import { computeCompassionateStreak } from "./streaks";
import { selfReportSleepSignal } from "./sleepInsight";
import { topFireableSignal, type InflectionSignal } from "./nilaInflection";
import { loadActivities, computeInsight, type BAInsight } from "./behaviouralActivation";
import { loadAssessments, latestFor, INSTRUMENTS, type InstrumentId } from "./assessments";
import { loadMoodHistory } from "./moodHistory";
import { DAY_MS } from "./storageUtils";

export interface StateDigest {
  recentCheckins: number;
  avgDistress: number | null;
  topEmotions: string[];
  streak: number;
  baDone: number;
  baInsight: BAInsight;
  sleepSignal: { shortSleep: boolean; nights: number } | null;
  inflection: InflectionSignal | null;
  screeningBand: string | null;
}

function readArray(key: string): any[] {
  try {
    const raw = secureLocal.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanEmotion(label: unknown): string {
  return String(label ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
}

function topCounts(items: string[], n: number): string[] {
  const tally = new Map<string, number>();
  for (const it of items) {
    const k = it.trim();
    if (!k) continue;
    tally.set(k, (tally.get(k) || 0) + 1);
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

/** Compute a unified state digest from all existing engines. */
export function computeStateDigest(): StateDigest {
  const since14 = daysAgo(14);

  // Check-ins (last 2 weeks)
  const checkins = readArray("nilamind_checkins")
    .filter((e) => {
      const d = new Date(e?.date);
      return !isNaN(d.getTime()) && d >= since14;
    });
  const intensities = checkins.map((e) => Number(e.intensity)).filter((n) => !isNaN(n));
  const avgDistress = intensities.length
    ? Math.round((intensities.reduce((a, n) => a + n, 0) / intensities.length) * 10) / 10
    : null;
  const topEmotions = topCounts(checkins.map((e) => cleanEmotion(e.emotion)).filter(Boolean), 3);

  // Streak
  let streak = 0;
  try {
    const s = computeCompassionateStreak();
    if (s?.current) streak = s.current;
  } catch { /* best-effort */ }

  // BA activities
  const baActs = loadActivities();
  const baInsight = computeInsight(baActs);

  // Sleep signal
  const sleepSig = selfReportSleepSignal();
  const sleepSignal = sleepSig ? { shortSleep: sleepSig.firing, nights: sleepSig.nightsBelow } : null;

  // Inflection
  const inflection = topFireableSignal();

  // Screening band
  let screeningBand: string | null = null;
  try {
    const assessments = loadAssessments();
    for (const id of ["PHQ-9", "GAD-7"] as InstrumentId[]) {
      const last = latestFor(id, assessments);
      if (last) {
        const inst = INSTRUMENTS[id];
        screeningBand = `${id}: ${last.total}/${inst.maxScore} (${last.severity})`;
        break;
      }
    }
  } catch { /* best-effort */ }

  return {
    recentCheckins: checkins.length,
    avgDistress,
    topEmotions,
    streak,
    baDone: baInsight.done,
    baInsight,
    sleepSignal,
    inflection,
    screeningBand,
  };
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

/** Format the state digest as a context block for Nila's system prompt. */
export function stateDigestContextBlock(digest: StateDigest): string {
  const lines: string[] = [];

  if (digest.recentCheckins > 0) {
    let l = `- ${digest.recentCheckins} check-in${digest.recentCheckins > 1 ? "s" : ""} in the last two weeks`;
    if (digest.avgDistress != null) l += `, distress averaging ${digest.avgDistress}/10`;
    if (digest.topEmotions.length) l += `, most often ${digest.topEmotions.join(", ")}`;
    lines.push(l + ".");
  }

  if (digest.streak >= 2) {
    lines.push(`- ${digest.streak}-day streak — they keep showing up.`);
  }

  if (digest.baDone > 0) {
    let ba = `- ${digest.baDone} activit${digest.baDone === 1 ? "y" : "ies"} logged`;
    if (digest.baInsight.topCategory) ba += ` — ${digest.baInsight.topCategory.label} lifts them most`;
    lines.push(ba + ".");
  }

  if (digest.sleepSignal?.shortSleep) {
    lines.push(`- Short-sleep signal firing (${digest.sleepSignal.nights} nights) — worth holding gently.`);
  }

  if (digest.inflection) {
    const dir = digest.inflection.direction === "deterioration" ? "upward" : "downward";
    lines.push(`- A ${dir} shift in their ${digest.inflection.metric} — ${digest.inflection.detail}.`);
  }

  if (digest.screeningBand) {
    lines.push(`- Latest screening: ${digest.screeningBand}.`);
  }

  return lines.join("\n");
}

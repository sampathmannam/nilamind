// Family / caregiver support — privacy-preserving, user-initiated sharing.
// Indian context: family is often part of care, but NilaMind is privacy-first (no cloud). So "sharing"
// means the USER chooses to generate a plain-language, non-diagnostic snapshot of their own progress and
// hand it to a trusted person — via copy/paste or the native share sheet. Nila never sends anything.
// No clinical claims; the summary is encouragement + crisis info only.
//
// Phase 19 — enhanced with phase markers, wellbeing trajectory, sleep patterns,
// and checkin frequency, all gated by per-contact share-category preferences.

import { computeStreak } from "./streaks";
import { loadMoodHistory } from "./moodHistory";
import { adherenceSummary } from "./medicationAdherence";
import { getCrisisLines } from "./crisisResources";
import { currentPhase } from "./episodeMarker";
import { wellbeingLongitudinal } from "./wellbeingTrack";
import { sleepTrend } from "./usageAnalytics";
import { nilaStats } from "./nilaSessions";
import { secureLocal } from "./secureLocal";
import { DEFAULT_PREFERENCES, type CaregiverPreferences } from "./caregiverPreferences";
import type { CheckInEntry } from "../types";

function loadCheckins(): CheckInEntry[] {
  try {
    const raw = secureLocal.getItem("nilamind_checkins");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export interface CaregiverSnapshot {
  headline: string;
  lines: string[];
  crisisLines: string[];
}

/**
 * Build a warm, non-diagnostic snapshot the user can share with a trusted person.
 * Each data block gates on `prefs.shareCategories.*` — the user controls exactly what is visible.
 * Defaults to DEFAULT_PREFERENCES (phase + wellbeing on; mood/sleep/medication/checkins off).
 */
export function buildCaregiverSnapshot(prefs?: CaregiverPreferences): CaregiverSnapshot {
  const p = prefs ?? { ...DEFAULT_PREFERENCES };
  const cats = p.shareCategories;

  const streak = computeStreak();
  const mood = loadMoodHistory().slice(-14);
  const adherence = adherenceSummary();

  const lines: string[] = [];

  // ── Streak / showing up (always shown — the "they care" signal) ──
  if (streak.current > 0) {
    lines.push(`They've shown up for themselves ${streak.current} day${streak.current > 1 ? "s" : ""} in a row.`);
  } else {
    lines.push("They're taking things one day at a time.");
  }

  // ── Mood trend (gated by shareCategories.mood) ──
  if (cats.mood && mood.length >= 3) {
    const recent = mood.slice(-3).map((m) => m.intensity ?? 5);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    if (avg <= 4) lines.push("Lately their self-reported distress has been on the lower side — that's a good sign.");
    else if (avg >= 7) lines.push("Lately their self-reported distress has been higher — gentle support means a lot right now.");
    else lines.push("Their recent days have been mixed — steady presence helps.");
  }

  // ── Phase marker (gated by shareCategories.phase — P19) ──
  if (cats.phase) {
    const phase = currentPhase();
    if (phase) {
      const range = phase.startDate === phase.endDate ? phase.startDate : `${phase.startDate} – ${phase.endDate}`;
      const label = phase.phase.charAt(0).toUpperCase() + phase.phase.slice(1);
      lines.push(`They've marked a ${label.toLowerCase()} period (${range}). This is their own tag — a pattern they've noticed, not a diagnosis.`);
    }
  }

  // ── Wellbeing trajectory (gated by shareCategories.wellbeing — P19) ──
  if (cats.wellbeing) {
    const wb = wellbeingLongitudinal();
    if (wb.trajectory) {
      lines.push(`Their wellbeing (WHO-5) has been trending ${wb.trajectory} lately.${wb.isDue ? " Their next check is due soon." : ""}`);
    } else if (wb.isDue) {
      lines.push("Their wellbeing check is due — they can take it when they're ready.");
    }
  }

  // ── Sleep pattern (gated by shareCategories.sleep — P19) ──
  if (cats.sleep) {
    const trend = sleepTrend(loadCheckins());
    if (trend) {
      const avg = ((trend.recentAvg + trend.olderAvg) / 2).toFixed(1);
      const delta = trend.recentAvg - trend.olderAvg;
      const dir = delta > 0.5 ? "improving" : delta < -0.5 ? "a bit unsettled" : "steady";
      lines.push(`Their sleep has been ${dir} lately (about ${avg}h on average).`);
    }
  }

  // ── Medication adherence (gated by shareCategories.medication) ──
  if (cats.medication && adherence.activeMeds > 0) {
    lines.push(`They're keeping up with ${adherence.activeMeds} medication${adherence.activeMeds > 1 ? "s" : ""} (about ${adherence.avgAdherence}% taken lately).`);
  }

  // ── Check-in frequency (gated by shareCategories.checkins — P19) ──
  if (cats.checkins) {
    const stats = nilaStats();
    if (stats.total > 0) {
      lines.push(`They've checked in ${stats.total} time${stats.total > 1 ? "s" : ""} — they're putting in the work.`);
    }
  }

  lines.push("This app is a wellness companion, not a substitute for professional care.");

  const crisis = getCrisisLines().slice(0, 3).map((l) => `${l.name}: ${l.display}`);
  if (crisis.length === 0) crisis.push("If there's immediate danger, call local emergency services.");

  return {
    headline: "A note from someone who uses NilaMind",
    lines,
    crisisLines: crisis,
  };
}

/** Plain-text version for copy/share. */
export function caregiverSummaryText(prefs?: CaregiverPreferences): string {
  const s = buildCaregiverSnapshot(prefs);
  return [
    s.headline,
    "",
    ...s.lines.map((l) => "• " + l),
    "",
    "If they're in crisis:",
    ...s.crisisLines.map((l) => "• " + l),
  ].join("\n");
}

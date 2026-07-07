// Family / caregiver support — privacy-preserving, user-initiated sharing.
// Indian context: family is often part of care, but NilaMind is privacy-first (no cloud). So "sharing"
// means the USER chooses to generate a plain-language, non-diagnostic snapshot of their own progress and
// hand it to a trusted person — via copy/paste or the native share sheet. Nila never sends anything.
// No clinical claims; the summary is encouragement + crisis info only.

import { computeStreak } from "./streaks";
import { loadMoodHistory } from "./moodHistory";
import { adherenceSummary } from "./medicationAdherence";
import { getCrisisLines } from "./crisisResources";

export interface CaregiverSnapshot {
  headline: string;
  lines: string[];
  crisisLines: string[];
}

/** Build a warm, non-diagnostic snapshot the user can share with a trusted person. */
export function buildCaregiverSnapshot(): CaregiverSnapshot {
  const streak = computeStreak();
  const mood = loadMoodHistory().slice(-14);
  const adherence = adherenceSummary();

  const lines: string[] = [];
  if (streak.current > 0) {
    lines.push(`They've shown up for themselves ${streak.current} day${streak.current > 1 ? "s" : ""} in a row.`);
  } else {
    lines.push("They're taking things one day at a time.");
  }
  if (mood.length >= 3) {
    const recent = mood.slice(-3).map((m) => m.intensity ?? 5);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    if (avg <= 4) lines.push("Lately their self-reported distress has been on the lower side — that's a good sign.");
    else if (avg >= 7) lines.push("Lately their self-reported distress has been higher — gentle support means a lot right now.");
    else lines.push("Their recent days have been mixed — steady presence helps.");
  }
  if (adherence.activeMeds > 0) {
    lines.push(`They're keeping up with ${adherence.activeMeds} medication${adherence.activeMeds > 1 ? "s" : ""} (about ${adherence.avgAdherence}% taken lately).`);
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
export function caregiverSummaryText(): string {
  const s = buildCaregiverSnapshot();
  return [
    s.headline,
    "",
    ...s.lines.map((l) => "• " + l),
    "",
    "If they're in crisis:",
    ...s.crisisLines.map((l) => "• " + l),
  ].join("\n");
}

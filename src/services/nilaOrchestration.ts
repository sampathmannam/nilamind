// nilaOrchestration — pure, on-device decision of what Nila offers after a check-in. No network, no
// AI inference: deterministic from the entry + recent history so it works offline. Crisis is handled
// upstream (scanForCrisis / getCrisisReply) and never reaches here. The AI layers conversation on top
// of these cards.

import { stripProvenance } from "./emotionParse";
import { skillForEmotion } from "./skillsLibrary";
import { latestFor, daysSince } from "./assessments";
import type { CheckInEntry } from "../types";

export type NilaCard = {
  kind: "grounding" | "episode" | "skill" | "screening";
  skillId?: string;
  instrument?: "PHQ-9" | "GAD-7";
  label: string;
};

const LOW_MOOD = /low|sad|down|empty|hopeless/i;
const ANX_MOOD = /anx|worr|overwhelm|panic|nervous/i;

/** "Sustained mood": at least 3 of the last 5 check-ins (each within 14 days) have a base emotion
 *  matching `re` AND intensity >= 5. Suffix-stripped before matching. */
function sustainedMood(recent: CheckInEntry[], re: RegExp): boolean {
  const today = new Date(new Date().toISOString().split("T")[0] + "T00:00:00").getTime();
  // Sort a shallow copy newest-first so slice(0,5) always picks the 5 most-recent entries
  // regardless of whether the caller passes oldest-first (storage order) or newest-first.
  const last5 = [...recent].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0)).slice(0, 5);
  let n = 0;
  for (const c of last5) {
    if (!c) continue;
    const then = new Date(c.date + "T00:00:00").getTime();
    if (Number.isNaN(then)) continue;
    const days = Math.floor((today - then) / 86400000);
    if (days > 14) continue;
    if ((c.intensity ?? 0) >= 5 && re.test(stripProvenance(c.emotion || ""))) n++;
  }
  return n >= 3;
}

/** True when an instrument is "due": its sustained-mood predicate holds AND it's never been taken
 *  (daysSince === null) or it was last taken more than 14 days ago. The `=== null` arm is load-bearing:
 *  `null > 14` is false, so without it the never-screened case would silently never fire. */
function screeningDue(recent: CheckInEntry[], re: RegExp, instrument: "PHQ-9" | "GAD-7"): boolean {
  if (!sustainedMood(recent, re)) return false;
  const d = daysSince(latestFor(instrument));
  return d === null || d > 14;
}

/** Decide the in-chat cards to surface after a check-in. Order: intensity escalation (grounding +
 *  episode), then a matched skill, then a due screening. Crisis is handled before this is called. */
export function cardsForCheckin(entry: CheckInEntry, recent: CheckInEntry[]): NilaCard[] {
  const cards: NilaCard[] = [];

  if ((entry.intensity ?? 0) >= 7) {
    cards.push({ kind: "grounding", label: "Try grounding" });
    cards.push({ kind: "episode", label: "I'm in an episode" });
  }

  const skill = skillForEmotion(stripProvenance(entry.emotion || ""));
  if (skill) cards.push({ kind: "skill", skillId: skill.id, label: skill.name });

  if (screeningDue(recent, LOW_MOOD, "PHQ-9")) {
    cards.push({ kind: "screening", instrument: "PHQ-9", label: "Take the PHQ-9" });
  }
  if (screeningDue(recent, ANX_MOOD, "GAD-7")) {
    cards.push({ kind: "screening", instrument: "GAD-7", label: "Take the GAD-7" });
  }

  return cards;
}

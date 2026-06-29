// src/services/nilaCards.ts
// Merges Nila's two in-chat card sources into one list for the unified screen:
//   1) deterministic, on-device check-in cards (cardsForCheckin — grounding/episode/skill/screening)
//   2) the AI-named skill card (findSkillInText on Nila's latest reply — the existing inline pattern)
// Pure + dedup-tested so the React render stays thin.

import { cardsForCheckin, type NilaCard } from "./nilaOrchestration";
import { findSkillInText } from "./skillsLibrary";
import { CheckInEntry } from "../types";

/** A skill card for the skill Nila named in a reply, or null when none was named. */
export function skillCardFromReply(replyText: string): NilaCard | null {
  const skill = findSkillInText(replyText || "");
  if (!skill) return null;
  return { kind: "skill", skillId: skill.id, label: skill.name };
}

/** Deterministic check-in cards + the AI-named skill card, with skill-card dedupe by skillId. */
export function cardsForReply(
  replyText: string,
  entry: CheckInEntry | null,
  recent: CheckInEntry[]
): NilaCard[] {
  const base = entry ? cardsForCheckin(entry, recent) : [];
  const fromReply = skillCardFromReply(replyText);
  if (!fromReply) return base;
  const already = base.some((c) => c.kind === "skill" && c.skillId === fromReply.skillId);
  return already ? base : [...base, fromReply];
}

// src/services/nilaCards.ts
// Merges Nila's two in-chat card sources into one list for the unified screen:
//   1) deterministic, on-device check-in cards (cardsForCheckin — grounding/episode/skill/screening)
//   2) the AI-named skill card (findSkillInText on Nila's latest reply — the existing inline pattern)
// Pure + dedup-tested so the React render stays thin.

import { cardsForCheckin, type NilaCard } from "./nilaOrchestration";
import { findSkillInText } from "./skillsLibrary";
import { bestSkill } from "./skillRetrieval";
import { CheckInEntry } from "../types";

/** A skill card for the skill Nila named in a reply, or null when none was named. */
export function skillCardFromReply(replyText: string): NilaCard | null {
  const skill = findSkillInText(replyText || "");
  if (!skill) return null;
  return { kind: "skill", skillId: skill.id, label: skill.name };
}

/**
 * A skill card routed DETERMINISTICALLY from the USER's own message (lexical RAG over the evidence-based
 * corpus) — not from the model's reply. This is the reframe: the app's reliable retrieval surfaces the right
 * tool regardless of whether the small on-device model named a good skill. Confident-or-null (never a wrong
 * tool): bestSkill returns null below its score floor.
 */
export function skillCardFromMessage(userText: string): NilaCard | null {
  const skill = bestSkill(userText || "");
  if (!skill) return null;
  return { kind: "skill", skillId: skill.id, label: skill.name };
}

/**
 * Check-in cards + ONE skill card, with skill-card dedupe by skillId. The skill card PREFERS the tool matched
 * from the user's own words (skillCardFromMessage — reliable) and falls back to the skill the model named in
 * its reply (skillCardFromReply). userText is optional so existing callers stay unchanged.
 */
export function cardsForReply(
  replyText: string,
  entry: CheckInEntry | null,
  recent: CheckInEntry[],
  userText = ""
): NilaCard[] {
  const base = entry ? cardsForCheckin(entry, recent) : [];
  const skillCard = skillCardFromMessage(userText) ?? skillCardFromReply(replyText);
  if (!skillCard) return base;
  const already = base.some((c) => c.kind === "skill" && c.skillId === skillCard.skillId);
  return already ? base : [...base, skillCard];
}

// src/services/nilaCards.ts
// Merges Nila's two in-chat card sources into one list for the unified screen:
//   1) deterministic, on-device check-in cards (cardsForCheckin — grounding/episode/skill/screening)
//   2) the AI-named skill card (findSkillInText on Nila's latest reply — the existing inline pattern)
// Pure + dedup-tested so the React render stays thin.

import { cardsForCheckin, type NilaCard } from "./nilaOrchestration";
import { findSkillInText } from "./skillsLibrary";
import { bestSkill } from "./skillRetrieval";
import { protocolOffer, getActiveProgress } from "./protocolProgress";
import { scanForCrisis } from "../safety";
import { shouldRunSynthesis, extractWeeklyFacts, weeklySynthesisPrompt, recordSynthesisTimestamp } from "./weeklySynthesis";
import { generateOnDevice, isLocalLlmReady } from "./localLlm";
import { applyOutputSafety } from "./nilaSafetyGate";
import type { CheckInEntry } from "../types";

/**
 * A gentle "start a structured program" offer card, shown when the person's message matches an evidence-based
 * protocol AND none is already active (Phase 1). Kept SEPARATE from cardsForReply — which stays pure — because
 * it reads the active-protocol state. The CALLER must suppress it on a §9/crisis turn and rate-limit offers.
 */
export function protocolCard(userText: string): NilaCard | null {
  const p = protocolOffer(userText);
  return p ? { kind: "protocol", protocolId: p.id, label: `Try ${p.title} with me` } : null;
}

/**
 * A gentle "continue where you left off" card, shown on reopen when a structured program is mid-way — the
 * between-sessions presence for protocols. Returns null when nothing is active. The card carries the same
 * kind:"protocol"; the screen handler distinguishes resume from start by checking the active state at tap time
 * (active → continue at the current step; none → start from step 0), so no separate action type is needed.
 */
export function protocolResumeCard(): NilaCard | null {
  const active = getActiveProgress();
  if (!active) return null;
  return {
    kind: "protocol",
    protocolId: active.protocol.id,
    label: `Continue ${active.protocol.title} — step ${active.stepIndex + 1} of ${active.total}`,
  };
}

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
 * Deterministic help to surface WHILE Nila's on-device model is still cold-loading (the multi-minute first
 * reply). A distressed person shouldn't stare at a spinner — offer the evidence-based tool matched from their OWN
 * words: an in-the-moment skill first (instant relief), then a structured program if one fits. Both work with no
 * model, so nothing here can hallucinate or stall. Empty for a benign/blank message. The CALLER must still gate
 * on §9 (a crisis turn is owned by the crisis UI, never a program offer). Same reliable routing as the reply
 * cards, so it can never surface a wrong tool.
 */
export function waitingCards(userText: string): NilaCard[] {
  // §9 FLOOR (deterministic, synchronous): these cards render during the load window BEFORE the async crisis
  // state flips, so we re-apply the crisis scan here — a person in crisis must NEVER be offered a self-help
  // program/skill instead of crisis support, even if their words also match a protocol cue.
  if (scanForCrisis(userText)) return [];
  const out: NilaCard[] = [];
  const skill = skillCardFromMessage(userText);
  if (skill) out.push(skill);
  const protocol = protocolCard(userText);
  if (protocol) out.push(protocol);
  return out;
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

export function weeklySynthesisCard(): NilaCard | null {
  if (!shouldRunSynthesis()) return null;
  const facts = extractWeeklyFacts();
  if (facts.checkinCount === 0) return null;
  return { kind: "weekly_synthesis", label: "See how your week went" };
}

export async function runWeeklySynthesis(): Promise<string | null> {
  if (!isLocalLlmReady()) return null;
  const facts = extractWeeklyFacts();
  const prompt = weeklySynthesisPrompt(facts);
  const reply = await generateOnDevice(
    "You are Nila. In 3-4 warm, plain sentences, reflect back the week's data the way a friend who remembers would. Never quote stats like a dashboard; weave them naturally.",
    [{ role: "user", content: prompt }],
  );
  if (!reply) return null;
  const safe = applyOutputSafety(reply, "weekly synthesis", true);
  recordSynthesisTimestamp();
  return safe;
}

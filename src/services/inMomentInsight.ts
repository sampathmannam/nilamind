// In-moment insight — the brief, research-cited "why you might feel this way" explainer +
// a relevant skill/tool suggestion, surfaced under Nila's reply. Pure + deterministic
// (no model, no network): it reuses the on-device psychoeducation library and the
// existing skill-suggestion engine. Never fires over crisis text (§9 floor).
//
// Privacy: the insight is a UI-only artifact attached to the assistant message; it is
// stripped before any model call (buildOutgoing maps only role/content) so it never leaves
// the device and never reaches the LLM.

import { PSYCHOED_TOPICS, searchPsychoed, type PsychoedTopic } from "./psychoed";
import { suggestSkill, type SkillSuggestion } from "./skillSuggest";
import { scanForCrisis } from "../safety";
import type { UserState } from "../types/modes";

export interface InMomentInsight {
  /** Research-cited explanation — "why you might feel this way". */
  explainer?: PsychoedTopic;
  /** Suggested, evidence-based skill/tool for right now. */
  skill?: SkillSuggestion;
}

// Manic-first / state-driven preference: when we already know the user's state, prefer the
// explainer that matches it (deterministic, always relevant) over a weaker lexical guess.
const STATE_TOPIC: Partial<Record<UserState, string>> = {
  anxious: "anxiety-alarm",
  low: "depression-action",
  elevated: "circadian-bipolar",
  // calm: rely on the lexical match only — don't over-explain when the user is settled.
};

/**
 * Derive the in-moment insight for a user message. Returns null when there is nothing
 * safe + relevant to show (empty, crisis, or benign chit-chat). The explainer falls back
 * to a lexical psychoeducation match when no state is known; the skill reuses suggestSkill.
 */
export function deriveInMomentInsight(
  userMessage: string,
  userState: UserState | null,
): InMomentInsight | null {
  const text = (userMessage || "").trim();
  if (!text || scanForCrisis(text)) return null; // §9: never psychoeducate over crisis

  const insight: InMomentInsight = {};

  // 2) Suggested skill/tool (reuses the existing deterministic engine). A non-null
  // skill is also the distress signal that makes a "why you feel this way" explainer safe
  // to surface — we never psychoeducate over benign chit-chat (precision over recall).
  const skill = suggestSkill(text);

  // 1) "Why you might feel this way" — research-cited explainer. State-driven topics
  // are strong signals, so they always show; the lexical fallback only shows when a
  // co-occurring distress signal (skill) is present, to avoid a false explainer.
  const stateId = userState ? STATE_TOPIC[userState] : undefined;
  const stateTopic = stateId ? PSYCHOED_TOPICS.find((t) => t.id === stateId) : undefined;
  const lexical = skill ? searchPsychoed(text)[0] : undefined; // relevance-gated by searchPsychoed
  const explainer: PsychoedTopic | undefined = stateTopic ?? lexical;
  if (explainer) insight.explainer = explainer;

  if (skill) insight.skill = skill;

  return insight.explainer || insight.skill ? insight : null;
}

// In-moment insight — the brief, research-cited "why you might feel this way" explainer +
// a relevant skill/tool suggestion, surfaced under Nila's reply. The explainer is matched
// semantically (on-device MiniLM embeddings via psychoedRetrieval — the same retriever that
// already grounds Nila's own replies) with a deterministic lexical fallback if the embedder
// isn't ready. The skill stays independently lexical (suggestSkill), unchanged. Never fires
// over crisis text (§9 floor).
//
// Privacy: the insight is a UI-only artifact attached to the assistant message; it is
// stripped before any model call (buildOutgoing maps only role/content) so it never leaves
// the device and never reaches the LLM.

import { searchPsychoed, type PsychoedTopic } from "./psychoed";
import { embeddingSearchPsychoed, type PsychoedResult } from "./psychoedRetrieval";
import { suggestSkill, type SkillSuggestion } from "./skillSuggest";
import { scanForCrisis } from "../safety";
import type { UserState } from "../types/modes";

export interface InMomentInsight {
  /** Research-cited explanation — "why you might feel this way". */
  explainer?: PsychoedTopic;
  /** Suggested, evidence-based skill/tool for right now. */
  skill?: SkillSuggestion;
}

// Soft tie-breaker only (NOT a fallback): when the top two embedding matches are within
// TIE_BREAK_EPSILON of each other, prefer the topic aligned with the user's known state. A
// known state can never promote a topic that didn't clear EXPLAINER_MIN_SCORE on its own —
// that blind-fallback behavior used to show the same state-linked card regardless of what the
// user actually said (confirmed bug: an appointment-logistics message showed the
// "circadian-bipolar" card purely because the state was "elevated").
const STATE_TOPIC: Partial<Record<UserState, string>> = {
  anxious: "anxiety-alarm",
  low: "depression-action",
  elevated: "circadian-bipolar",
};

// Precision bar for showing the explainer as a standalone, asserted card — higher than
// psychoedRetrieval's own RAG_MIN_SCORE (0.25), which only gates a soft hint the chat LLM may
// silently ignore. A direct claim shown to the user needs more headroom against false matches.
const EXPLAINER_MIN_SCORE = 0.32;
const TIE_BREAK_EPSILON = 0.03;

/**
 * Decide the final explainer from a relevance-ranked list: applies the state tie-break, then
 * repeat-avoidance (never show the same card two turns in a row — falls through to the next
 * candidate that already cleared the relevance bar, or suppresses if none remain). Pure and
 * synchronous so it's directly unit-testable with hand-built score arrays.
 */
export function pickExplainer(
  ranked: PsychoedResult[],
  userState: UserState | null,
  previousExplainerId: string | null,
): PsychoedTopic | null {
  if (ranked.length === 0) return null;

  const stateId = userState ? STATE_TOPIC[userState] : undefined;
  let best = ranked[0];
  const isSyntheticLexicalScores = ranked[0].score === 1 && ranked[1]?.score === 0.5;

  if (stateId && ranked.length > 1 && ranked[0].topic.id !== stateId && ranked[1].topic.id === stateId) {
    // For semantic search: apply state tie-break if scores are within epsilon
    // For lexical fallback: always prefer state topic if available in results
    if (isSyntheticLexicalScores || ranked[0].score - ranked[1].score <= TIE_BREAK_EPSILON) {
      best = ranked[1];
    }
  }

  if (best.topic.id === previousExplainerId) {
    const next = ranked.find((r) => r.topic.id !== previousExplainerId);
    return next ? next.topic : null;
  }

  return best.topic;
}

/**
 * Resolve the best-matching explainer via semantic (embedding) search, with a deterministic
 * lexical fallback if the embedder isn't ready (not yet warmed at cold start, or absent in a
 * test environment — ModeScreen.test.tsx never calls setPsychoedEmbedder). The two synthetic
 * lexical scores (1 / 0.5) are spaced well outside TIE_BREAK_EPSILON so the state tie-break
 * never spuriously fires on the coarser lexical fallback path.
 */
async function resolveExplainer(
  text: string,
  userState: UserState | null,
  previousExplainerId: string | null,
): Promise<PsychoedTopic | null> {
  let ranked: PsychoedResult[];
  try {
    ranked = await embeddingSearchPsychoed(text, { limit: 2, minScore: EXPLAINER_MIN_SCORE });
    if (ranked.length === 0) throw new Error("No embeddings found"); // Trigger fallback
  } catch {
    const lex = searchPsychoed(text).slice(0, 2);
    ranked = lex.map((t, i) => ({ topic: t, score: i === 0 ? 1 : 0.5 }));
  }
  return pickExplainer(ranked, userState, previousExplainerId);
}

/**
 * Derive the in-moment insight for a user message. Returns null when there is nothing
 * safe + relevant to show (empty, crisis, or benign chit-chat). The explainer's own relevance
 * score is its gate — independent of the skill suggestion, which keeps its own lexical gate.
 *
 * `previousExplainerId` should be the `explainer.id` shown on the immediately-previous
 * assistant turn (or null/omitted for the first turn) so repeat-avoidance can apply.
 */
export async function deriveInMomentInsight(
  userMessage: string,
  userState: UserState | null,
  previousExplainerId: string | null = null,
): Promise<InMomentInsight | null> {
  const text = (userMessage || "").trim();
  if (!text || scanForCrisis(text)) return null; // §9: never psychoeducate over crisis

  const insight: InMomentInsight = {};

  const skill = suggestSkill(text);
  if (skill) insight.skill = skill;

  const explainer = await resolveExplainer(text, userState, previousExplainerId);
  if (explainer) insight.explainer = explainer;

  return insight.explainer || insight.skill ? insight : null;
}

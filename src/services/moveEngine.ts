/**
 * Move Engine — Ash-style conversational move classifier.
 *
 * Classifies each user turn into one of six moves, then selects
 * the appropriate steer prompt + exemplar filter for the reply.
 *
 * Moves (mutually exclusive, chosen by priority):
 *   CLARIFY     — user is vague, confused, or contradictory → ask ONE specific question
 *   DEEPEN      — user is circling the same topic → gently widen the frame
 *   HOLD        — user is venting / overwhelmed → reflect back, no question
 *   REPAIR      — user is shutting down or attacking self → soften + absolve + one question
 *   REFLECT_ASK — default for emotional disclosures → mirror + name + one question
 *   ANSWER      — user asked a factual / how-to question → answer + one follow-up
 *
 * Design:
 *   - Pure functions, no side effects, no network calls.
 *   - Deterministic lexical cue detection (no LLM call for classification).
 *   - Priority ordering prevents double-fire.
 *   - Every move produces a steer block injected into the system prompt.
 *   - Every move tags which exemplar move types to retrieve.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Move =
  | "CLARIFY"
  | "REFLECT_ASK"
  | "DEEPEN"
  | "HOLD"
  | "REPAIR"
  | "ANSWER";

export interface MoveResult {
  move: Move;
  steer: string;
  exemplarMoves: string[];
  questionAllowed: boolean;
}

// ---------------------------------------------------------------------------
// Lexical cues — deterministic, no false positives on benign control phrases
// ---------------------------------------------------------------------------

/** Vague / placeholder language → CLARIFY */
const VAGUE_CUES =
  /\b(idk|i don'?t know|something|stuff|things|whatever|just|like i said|i already told you)\b/i;

/** "why" / "how" / "what is" questions → ANSWER */
const FACTUAL_QUESTIONS =
  /\b(why|how|what|where|when|can you|could you|explain|tell me about|define|difference between)\b/i;

/** Prolonged venting (3+ sentences of emotional content, no question) → HOLD */
const VENTING_CUES =
  /\b(and then|and also|on top of that|to make it worse|another thing|same thing over|keeps happening|always the same|never changes)\b/i;

/** Self-attack language → REPAIR */
const SELF_ATTACK_CUES =
  /\b(i'?m (such )?(a )?(failure|loser|idiot|mess|burden|waste|stupid|worthless|broken|pathetic|useless|terrible)|i hate myself|i can'?t do anything right|nothing i do matters|i don'?t deserve|i should just disappear|i wish i was never born)\b/i;

/** "i just don't know" + "today morning" + garbled STT → REPAIR (soft overwhelm) */
const OVERWHELM_CUES =
  /\b(today morning|this morning|just don'?t know|i don'?t even know|i can'?t even|i just feel so|i feel so (lost|overwhelmed|stuck|confused))\b/i;

/** Previous message was a question → check if user is answering */
const USER_ANSWER_CUES =
  /\b(yes|no|yeah|nah|nahi|haan|right|exactly|actually|well)\b/i;

/** F5 fix: loaded word "episode" → highest-priority CLARIFY.
 * "episode" is the single highest-value word in a bipolar disclosure.
 * It must ALWAYS be asked about, no matter what else is in the message.
 * Ash treated "episode" as the most important word in the sentence.
 * Match: standalone "episode" or "an/the episode" (not "tv episode"). */
const EPISODE_CUES = /\b(had? an? episode|an? episode today|what episode|explain.*episode|an? episode happened|called? an? episode|(?<!my |his |her |their )episode$)\b/i;

/** Help-seeking language — user already sought professional care.
 * Must be acknowledged as positive action, not crisis.
 * This is the inverse of a crisis signal: it shows agency and coping. */
const HELP_SEEKING_CUES =
  /\b(consulted|seen|a psychiatrist|a therapist|doctor|mental health professional|got professional help|started therapy|went to therapy|appointment with|booked.*therapist|psychiatrist appointment)\b/i;

// ---------------------------------------------------------------------------
// Conversation context helpers
// ---------------------------------------------------------------------------

interface ConversationContext {
  recentNilaReplies: string[];
  recentUserMessages: string[];
  consecutiveQuestions?: number;
}

function lastNilaWasQuestion(recentNilaReplies: string[]): boolean {
  if (recentNilaReplies.length === 0) return false;
  const last = recentNilaReplies[recentNilaReplies.length - 1];
  return /\?\s*$/.test(last.trim());
}

function userIsAnswering(ctx: ConversationContext): boolean {
  if (!lastNilaWasQuestion(ctx.recentNilaReplies)) return false;
  const last = ctx.recentUserMessages[ctx.recentUserMessages.length - 1] ?? "";
  return USER_ANSWER_CUES.test(last);
}

function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
}

function hasAnyQuestion(text: string): boolean {
  return /\?/.test(text);
}

/** Extract content words (deterministic, no network). Used for topic tracking. */
function extractContentWords(text: string): Set<string> {
  const stopWords = new Set([
    "i", "me", "my", "you", "your", "we", "our", "a", "an", "the", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
    "did", "will", "would", "could", "should", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "about", "just", "really",
    "very", "so", "like", "right", "yeah", "okay", "well", "that", "this",
    "these", "those", "what", "how", "why", "when", "where", "who", "which",
    "there", "here", "then", "now", "it", "its", "not", "no", "don", "doesn",
    "didn", "wasn", "isn", "aren", "won", "can", "couldn", "wouldn", "shouldn",
    "ve", "ll", "re", "s", "t", "m", "d", "and", "but", "or", "if", "than",
    "because", "him", "her", "us", "them", "all", "some", "any",
  ]);
  return new Set(
    text.toLowerCase().split(/[^a-z']+/).filter((w) => w.length >= 4 && !stopWords.has(w))
  );
}

/**
 * Compute topic overlap between the current user message and the last N user messages.
 * Used to detect when the user is circling the same topic (triggers DEEPEN escalation).
 * Returns 0-1 Jaccard score.
 */
function computeTopicOverlap(currentMsg: string, recentUserMessages: string[]): number {
  if (recentUserMessages.length === 0) return 0;
  const lastFew = recentUserMessages.slice(-3);
  const currentWords = extractContentWords(currentMsg);
  if (currentWords.size === 0) return 0;

  let totalOverlap = 0;
  for (const msg of lastFew) {
    const msgWords = extractContentWords(msg);
    if (msgWords.size === 0) continue;
    const intersection = [...currentWords].filter((w) => msgWords.has(w)).length;
    const union = new Set([...currentWords, ...msgWords]).size;
    totalOverlap += union === 0 ? 0 : intersection / union;
  }
  return totalOverlap / lastFew.length;
}

// ---------------------------------------------------------------------------
// Move classifier — priority-ordered, deterministic
// ---------------------------------------------------------------------------

/**
 * Classify a user message into a conversational move.
 *
 * Priority: REPAIR > HOLD > CLARIFY > ANSWER > REFLECT_ASK
 * (DEEPEN is not set by the classifier — it is a downstream escalation.)
 */
export function classifyMove(
  userMessage: string,
  ctx: ConversationContext = { recentNilaReplies: [], recentUserMessages: [] },
): Move {
  const msg = userMessage.trim();

  // 1. F5 fix — loaded word "episode" → CLARIFY (highest content priority).
  // Ash's #1 rule: "episode" is the most important word. Always ask what it was.
  // Placed FIRST so it outranks OVERWHELM_CUES (which would otherwise match "today morning" in
  // "I had an episode today morning" and steal priority).
  if (EPISODE_CUES.test(msg)) return "CLARIFY";

  // 2. Self-attack → REPAIR (safety-critical)
  if (SELF_ATTACK_CUES.test(msg)) return "REPAIR";

  // 3. Overwhelm / soft disclosure → REPAIR
  if (OVERWHELM_CUES.test(msg) && sentenceCount(msg) <= 2) return "REPAIR";

  // 4. Help-seeking language → REFLECT_ASK with positive acknowledgment.
  // "I saw a psychiatrist" = user took agency, not a crisis. Acknowledge it.
  if (HELP_SEEKING_CUES.test(msg)) return "REFLECT_ASK";

  // 5. Venting (long emotional dump, no question) → HOLD
  if (!hasAnyQuestion(msg) && sentenceCount(msg) >= 3 && VENTING_CUES.test(msg))
    return "HOLD";

  // 6. Vague / confused → CLARIFY
  if (VAGUE_CUES.test(msg) && !hasAnyQuestion(msg)) return "CLARIFY";

  // 7. Factual question → ANSWER
  if (hasAnyQuestion(msg) && FACTUAL_QUESTIONS.test(msg)) return "ANSWER";

  // 8. User answering a previous question → REFLECT_ASK (reflect what they said + one follow-up)
  if (userIsAnswering(ctx)) return "REFLECT_ASK";

  // 9. Default → REFLECT_ASK
  return "REFLECT_ASK";
}

// ---------------------------------------------------------------------------
// Steer generators — one per move
// ---------------------------------------------------------------------------

const STEER_CLARIFY = `You are in CLARIFY mode. They were vague or confused. Ask ONE specific, grounded question that helps you understand what they actually mean. Do not give advice. Do not reflect back. Just ask.

Example: "When you say 'things are bad,' what's one specific thing that's weighing on you right now?"`;

const STEER_REFLECT_ASK = `You are in REFLECT_ASK mode. They shared something real. Do this in order:
1. Reflect back the SPECIFIC detail they gave you — sharpen it in second person ("you felt...").
2. Name the emotional core in one plain line.
3. Connect to history if you have a relevant memory, otherwise skip.
4. End with ONE question that moves them forward.

CRITICAL: If they mention "episode" — that is ALWAYS the most important word.
Ask what happened during it. "What was that episode like for you?" is the right response.
Never treat "episode" as a passing reference. It is always the door to something real.

Do NOT give advice. Do NOT list options. Do NOT number anything. Keep it 2-5 short paragraphs, roughly 80 words.`;

const STEER_DEEPEN = `You are in DEEPEN mode. They keep circling the same feeling. Gently widen the frame:
1. Mirror the specific detail they keep returning to.
2. Name the pattern: "You keep coming back to..." or "This keeps surfacing..."
3. Offer ONE new angle — a question they haven't considered.
4. End with ONE question.

Do NOT repeat what you already said. Do NOT diagnose. 2-4 paragraphs, roughly 70 words.`;

const STEER_HOLD = `You are in HOLD mode. They are overwhelmed and venting. Do NOT ask a question. Do NOT give advice. Do NOT reframe.

Just hold the weight:
1. Reflect back the sharpest detail in their own words.
2. Name what you sense underneath ("That sounds exhausting" / "That takes a lot to carry").
3. Pause. Let silence do work.

If they pause, wait. Do not fill silence with a question. 2-3 sentences, roughly 50 words.`;

const STEER_REPAIR = `You are in REPAIR mode. They are shutting down or attacking themselves. This is a soft-crisis adjacent moment.

1. Reflect the specific thing they said — do not minimize.
2. Name the feeling without diagnosing it ("That sounds like it hurts" not "You're depressed").
3. Absolve: "You're not broken for feeling this."
4. End with ONE gentle question that opens a door, not a demand.

Do NOT list coping strategies. Do NOT suggest techniques. Keep it warm, short, roughly 60 words.`;

const STEER_ANSWER = `You are in ANSWER mode. They asked a factual or how-to question.

1. Answer directly — one clear sentence.
2. If you can reference something from their history that relates, weave it in warmly.
3. End with ONE follow-up question ("Does that match what you were thinking?" or similar).

Keep it practical. 2-3 sentences, roughly 50 words.`;

// ---------------------------------------------------------------------------
// Exemplar move tags — which corpus entries to retrieve per move
// ---------------------------------------------------------------------------

const MOVE_EXEMPLAR_MAP: Record<Move, string[]> = {
  CLARIFY: ["clarify-underneath+ask", "narrow-scope+ask", "reflect+ask", "mirror+ask"],
  REFLECT_ASK: [
    "reflect+ask",
    "validate+challenge-one-question",
    "reflect-the-specific",
    "name-the-weight",
    "validate+absolve",
    "normalize+ask",
  ],
  DEEPEN: [
    "notice-loop+ask",
    "gentle-confront+ask",
    "reframe+ask",
    "non-collusion+ask",
    "normalize",
  ],
  HOLD: [
    "hold",
    "sit-with-the-flat",
    "sit-with",
    "reflect",
    "normalize",
    "match-quiet+ask",
  ],
  REPAIR: [
    "name-the-harshness",
    "gentle-challenge+ask",
    "reframe+ask",
    "validate+absolve",
    "warmth+normalize",
    "warmth+widen+ask",
  ],
  ANSWER: [
    "one-fact+ask",
    "one-technique",
    "grounding-technique",
    "honest+reframe+ask",
    "honest-limit",
  ],
};

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Classify a user turn and return the full move result.
 * Computes topic overlap internally and escalates to DEEPEN when appropriate.
 * - move: the classified move
 * - steer: the system-prompt steer text for this move
 * - exemplarMoves: which exemplar move-tags to retrieve
 * - questionAllowed: whether the model should end with a question
 */
export function resolveMove(
  userMessage: string,
  ctx?: ConversationContext,
): MoveResult {
  const move = classifyMove(userMessage, ctx);

  // Build the base result
  let result: MoveResult;
  switch (move) {
    case "CLARIFY":
      result = { move, steer: STEER_CLARIFY, exemplarMoves: MOVE_EXEMPLAR_MAP.CLARIFY, questionAllowed: true };
      break;
    case "DEEPEN":
      result = { move, steer: STEER_DEEPEN, exemplarMoves: MOVE_EXEMPLAR_MAP.DEEPEN, questionAllowed: true };
      break;
    case "HOLD":
      result = { move, steer: STEER_HOLD, exemplarMoves: MOVE_EXEMPLAR_MAP.HOLD, questionAllowed: false };
      break;
    case "REPAIR":
      result = { move, steer: STEER_REPAIR, exemplarMoves: MOVE_EXEMPLAR_MAP.REPAIR, questionAllowed: true };
      break;
    case "ANSWER":
      result = { move, steer: STEER_ANSWER, exemplarMoves: MOVE_EXEMPLAR_MAP.ANSWER, questionAllowed: true };
      break;
    case "REFLECT_ASK":
    default:
      result = { move: "REFLECT_ASK", steer: STEER_REFLECT_ASK, exemplarMoves: MOVE_EXEMPLAR_MAP.REFLECT_ASK, questionAllowed: true };
      break;
  }

  // DEEPEN escalation: if REFLECT_ASK and topic overlap is high (user circling same topic),
  // escalate to DEEPEN to gently widen the frame instead of re-reflecting.
  if (ctx?.recentUserMessages && ctx.recentUserMessages.length > 0) {
    const topicOverlap = computeTopicOverlap(userMessage, ctx.recentUserMessages);
    return maybeEscalateToDeepen(result, topicOverlap);
  }

  return result;
}

/**
 * Escalate to DEEPEN if the move engine detects the user is circling.
 * Called when the user's message has significant topic/sentiment overlap
 * with recent user messages but they keep re-raising it.
 */
export function maybeEscalateToDeepen(
  result: MoveResult,
  topicOverlapScore: number,
): MoveResult {
  if (result.move !== "REFLECT_ASK") return result;
  if (topicOverlapScore < 0.6) return result;
  return {
    ...result,
    move: "DEEPEN",
    steer: STEER_DEEPEN,
    exemplarMoves: MOVE_EXEMPLAR_MAP.DEEPEN,
  };
}

/**
 * Output Guards — structural validation for Nila's replies.
 *
 * Runs BEFORE the reply is shown to the user, after streaming completes.
 * These are pure, deterministic checks (no LLM calls). They enforce
 * the Ash-style reply grammar and prevent degenerate outputs.
 *
 * All guards are advisory-by-default (flag + suggest fix) except
 * loop-guard and degeneration-guard which are hard blocks.
 */

import type { Move } from "./moveEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuardResult {
  pass: boolean;
  reason?: string;
  fix?: string;
}

// ---------------------------------------------------------------------------
// N-gram helpers
// ---------------------------------------------------------------------------

function bigrams(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const bg: string[] = [];
  for (let i = 0; i < words.length - 1; i++) bg.push(`${words[i]} ${words[i + 1]}`);
  return bg;
}

function trigrams(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const tg: string[] = [];
  for (let i = 0; i < words.length - 2; i++)
    tg.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  return tg;
}

function repeatedNGrams(text: string, n: number): number {
  const ngrams = n === 2 ? bigrams(text) : trigrams(text);
  if (ngrams.length === 0) return 0;
  const counts = new Map<string, number>();
  let maxCount = 0;
  for (const ng of ngrams) {
    const c = (counts.get(ng) ?? 0) + 1;
    counts.set(ng, c);
    if (c > maxCount) maxCount = c;
  }
  return maxCount;
}

// ---------------------------------------------------------------------------
// Scaffold leak detection
// ---------------------------------------------------------------------------

const SCAFFOLD_MARKERS = [
  /\b(them|nila)\s*:\s*"/i,
  /\b(exemplar|gold|ideal)\s*(reply|response)/i,
  /\b(match the length|speak as nila)\b/i,
  /\b(VALIDATE|REFLECT|REFRAME|CHALLENGE|CLARIFY|DEEPEN|HOLD|REPAIR)\b/,
  /\b(move|steer|register)\s*:/i,
  /\b(MOVE_ENGINE|OUTPUT_GUARD|EXEMPLAR)\b/,
  /\b(user|assistant)\s*:\s*"/i,
];

// ---------------------------------------------------------------------------
// Topic grounding helpers
// ---------------------------------------------------------------------------

function extractContentNouns(text: string): string[] {
  const stopWords = new Set([
    "i",
    "you",
    "we",
    "they",
    "it",
    "is",
    "am",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "shall",
    "to",
    "of",
    "in",
    "for",
    "on",
    "with",
    "at",
    "by",
    "from",
    "as",
    "into",
    "about",
    "just",
    "really",
    "very",
    "so",
    "like",
    "right",
    "yeah",
    "okay",
    "well",
    "that",
    "this",
    "these",
    "those",
    "what",
    "how",
    "why",
    "when",
    "where",
    "who",
    "which",
    "there",
    "here",
    "then",
    "now",
    "my",
    "your",
    "our",
    "their",
    "me",
    "him",
    "her",
    "us",
    "them",
    "a",
    "an",
    "the",
    "some",
    "any",
    "all",
    "and",
    "but",
    "or",
    "if",
    "than",
    "because",
    "not",
    "no",
    "don't",
    "doesn't",
    "didn't",
    "wasn't",
    "isn't",
    "aren't",
    "won't",
    "can't",
    "couldn't",
    "wouldn't",
    "shouldn't",
    "ve",
    "ll",
    "re",
    "s",
    "t",
    "m",
    "d",
  ]);
  return text
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
}

// ---------------------------------------------------------------------------
// Guard: Loop detection
// ---------------------------------------------------------------------------

/**
 * Rejects a reply if it is semantically too similar to the last N replies.
 * Uses simple word-overlap (cosine of bag-of-words) as a proxy — cheap
 * and deterministic. Threshold tuned for conversational text.
 */
export function loopGuard(
  reply: string,
  recentReplies: string[],
  threshold = 0.6,
): GuardResult {
  if (recentReplies.length === 0) return { pass: true };

  const replyWords = new Set(reply.toLowerCase().split(/\s+/));
  for (const prev of recentReplies) {
    const prevWords = new Set(prev.toLowerCase().split(/\s+/));
    const intersection = [...replyWords].filter((w) => prevWords.has(w)).length;
    const union = new Set([...replyWords, ...prevWords]).size;
    const sim = union === 0 ? 0 : intersection / union;
    if (sim >= threshold) {
      return {
        pass: false,
        reason: `Reply is ${Math.round(sim * 100)}% similar to a recent reply (threshold: ${Math.round(threshold * 100)}%)`,
        fix: "Rephrase. Use a different angle, different words, or a different question.",
      };
    }
  }
  return { pass: true };
}

// ---------------------------------------------------------------------------
// Guard: Degeneration (repeated n-grams)
// ---------------------------------------------------------------------------

/**
 * Rejects a reply if it contains excessive repeated n-grams,
 * indicating the model is degenerating into loops.
 */
export function degenerationGuard(reply: string): GuardResult {
  const maxBigram = repeatedNGrams(reply, 2);
  const maxTrigram = repeatedNGrams(reply, 3);

  if (maxTrigram >= 3) {
    return {
      pass: false,
      reason: `Repeated trigram appears ${maxTrigram} times`,
      fix: "The model is looping. Force a new angle or question.",
    };
  }
  if (maxBigram >= 4) {
    return {
      pass: false,
      reason: `Repeated bigram appears ${maxBigram} times`,
      fix: "Rephrase to avoid repeating the same phrase.",
    };
  }
  return { pass: true };
}

// ---------------------------------------------------------------------------
// Guard: Topic grounding
// ---------------------------------------------------------------------------

/**
 * Warns if the reply contains fewer than 2 content nouns from the user message.
 * This catches "I feel so overwhelmed" → generic "That sounds hard" replies
 * that don't reflect the user's specific situation.
 */
export function topicGroundingGuard(
  reply: string,
  userMessage: string,
): GuardResult {
  const userNouns = new Set(extractContentNouns(userMessage));
  const replyNouns = extractContentNouns(reply);
  const grounded = replyNouns.filter((n) => userNouns.has(n));

  if (grounded.length < 1 && userNouns.size >= 2) {
    return {
      pass: true,
      reason: `Reply references 0 of the user's ${userNouns.size} content nouns (advisory)`,
      fix: "Consider reflecting back a specific detail from their message.",
    };
  }
  return { pass: true };
}

// ---------------------------------------------------------------------------
// Guard: Scaffold leak
// ---------------------------------------------------------------------------

/**
 * Rejects a reply that contains internal scaffolding markers
 * (exemplar formatting, move labels, few-shot delimiters, etc.)
 */
export function scaffoldLeakGuard(reply: string): GuardResult {
  for (const marker of SCAFFOLD_MARKERS) {
    if (marker.test(reply)) {
      return {
        pass: false,
        reason: `Reply contains scaffold marker: ${marker.source}`,
        fix: "Strip internal formatting before showing to the user.",
      };
    }
  }
  return { pass: true };
}

// ---------------------------------------------------------------------------
// Guard: Question contract
// ---------------------------------------------------------------------------

/**
 * Enforces the question contract:
 * - HOLD moves: NO question allowed
 * - All other moves: exactly ONE question at the end
 */
export function questionContractGuard(
  reply: string,
  move: Move,
  questionAllowed: boolean,
): GuardResult {
  const questionCount = (reply.match(/\?/g) ?? []).length;

  if (!questionAllowed && questionCount > 0) {
    return {
      pass: false,
      reason: `HOLD move has ${questionCount} question(s) — should have 0`,
      fix: "Remove the question. In HOLD mode, just hold the weight.",
    };
  }

  if (questionAllowed && questionCount === 0) {
    return {
      pass: true,
      reason: "Move expects a question but reply has 0 (advisory)",
      fix: "End with one gentle question to move them forward.",
    };
  }

  if (questionAllowed && questionCount > 1) {
    return {
      pass: true,
      reason: `Reply has ${questionCount} questions — ideally 1 (advisory)`,
      fix: "Keep only the most important question.",
    };
  }

  return { pass: true };
}

// ---------------------------------------------------------------------------
// Guard: Lecture detection
// ---------------------------------------------------------------------------

/**
 * Rejects replies that are formatted as lectures (numbered/bulleted lists,
 * long paragraphs of advice). Listening moves (HOLD, REPAIR) should never
 * contain lists.
 */
export function lectureGuard(reply: string, move: Move): GuardResult {
  const hasList = /^[\s]*[-*•]\s/m.test(reply) || /^\s*\d+\.\s/m.test(reply);
  const isListening = move === "HOLD" || move === "REPAIR";

  if (isListening && hasList) {
    return {
      pass: false,
      reason: `${move} move should not contain lists`,
      fix: "Remove the list. Use plain, warm sentences.",
    };
  }

  if (hasList) {
    const listItems = (reply.match(/^[\s]*[-*•]\s|^\s*\d+\.\s/gm) ?? []).length;
    if (listItems > 3) {
      return {
        pass: true,
        reason: `Reply has ${listItems} list items — consider simplifying (advisory)`,
        fix: "Nila keeps things short. Pick the single most helpful point.",
      };
    }
  }

  return { pass: true };
}

// ---------------------------------------------------------------------------
// Guard: Length bounds
// ---------------------------------------------------------------------------

/**
 * Enforces approximate length bounds. Too short is usually a degenerate case;
 * too long is usually a lecture.
 */
export function lengthGuard(reply: string, move: Move): GuardResult {
  const words = reply.split(/\s+/).length;

  // Minimum: every move needs at least a sentence
  if (words < 10) {
    return {
      pass: false,
      reason: `Reply is only ${words} words — too short`,
      fix: "Say more. Reflect something specific, name a feeling, or ask a question.",
    };
  }

  // Maximum: varies by move
  const maxWords = move === "HOLD" ? 80 : move === "ANSWER" ? 100 : 120;
  if (words > maxWords) {
    return {
      pass: true,
      reason: `Reply is ${words} words (max ~${maxWords} for ${move}) (advisory)`,
      fix: "Shorten. Aim for 2-5 short paragraphs, roughly 80 words.",
    };
  }

  return { pass: true };
}

// ---------------------------------------------------------------------------
// Composite: run all guards
// ---------------------------------------------------------------------------

export interface RunGuardsOpts {
  reply: string;
  userMessage: string;
  move: Move;
  questionAllowed: boolean;
  recentReplies?: string[];
}

export function runOutputGuards(opts: RunGuardsOpts): GuardResult[] {
  const { reply, userMessage, move, questionAllowed, recentReplies = [] } = opts;

  const results: GuardResult[] = [
    loopGuard(reply, recentReplies),
    degenerationGuard(reply),
    scaffoldLeakGuard(reply),
    lectureGuard(reply, move),
    questionContractGuard(reply, move, questionAllowed),
    lengthGuard(reply, move),
    topicGroundingGuard(reply, userMessage),
  ];

  return results;
}

/**
 * Hard-fail guard: returns true if ANY guard has pass:false.
 * Used to block the reply from being shown.
 */
export function hasHardFailure(results: GuardResult[]): boolean {
  return results.some((r) => !r.pass);
}

/**
 * Soft warnings: advisory issues that don't block but could improve quality.
 */
export function hasSoftWarnings(results: GuardResult[]): boolean {
  return results.some((r) => r.pass && r.reason?.includes("advisory"));
}

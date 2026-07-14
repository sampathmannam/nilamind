// Response Quality Enhancement — chaining + classifier-guided selection.
// Research: Chaining improves perceived thoughtfulness (the model generates a warm
// opening, then a reflective follow-up). Multi-candidate generation with ranking
// improves safety and empathy (select the best response, not the first one).
//
// Both techniques work by calling completion() multiple times sequentially.
// The modelLock already serializes calls, so this is safe (just slower).

import type { LocalLlmBackend } from "./localLlm";

export interface QualityOptions {
  /** Enable response chaining — generate follow-up after first response. */
  chain?: boolean;
  /** Enable multi-candidate generation — generate N responses, pick best. */
  candidates?: number; // 1 = single generation (default), 3 = triple generation
}

/**
 * Score a response for quality.
 * Higher score = better response.
 */
function scoreResponse(
  response: string,
  userMessage: string,
): number {
  let score = 0;

  // Relevance: does it reference something from the user's message?
  const userWords = new Set(userMessage.toLowerCase().split(/\s+/));
  const replyWords = response.toLowerCase().split(/\s+/);
  let overlap = 0;
  for (const w of replyWords) {
    if (w.length < 3) continue;
    if (userWords.has(w)) overlap++;
  }
  score += Math.min(overlap, 5); // cap at 5 for relevance

  // Empathy: does it contain empathy markers?
  const empathyMarkers = ["hear you", "sounds", "feel", "hard", "tough", "understand", "matter"];
  for (const marker of empathyMarkers) {
    if (response.toLowerCase().includes(marker)) score += 2;
  }

  // Length: too short (< 20 chars) or too long (> 500 chars) is bad
  if (response.length < 20) score -= 5;
  if (response.length > 500) score -= 3;

  // Quality: avoid generic/formulaic openings
  const genericStarts = ["i'm sorry", "that's great", "i understand", "thank you"];
  for (const start of genericStarts) {
    if (response.toLowerCase().startsWith(start)) score -= 3;
  }

  // Celebration: avoid generic formulaic responses
  if (response.toLowerCase().includes("how may i assist")) score -= 10;
  if (response.toLowerCase().includes("let me know what else")) score -= 10;

  return score;
}

/**
 * Generate a response with optional chaining and multi-candidate selection.
 *
 * When chain=true: the model generates a warm opener, then a follow-up.
 * "I hear you — that sounds really hard. What's been the hardest part?"
 *
 * When candidates=3: generates 3 responses and returns the highest-scoring one.
 */
export async function generateQualityResponse(
  backend: LocalLlmBackend,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  userMessage: string,
  opts: QualityOptions = {},
): Promise<string> {
  const { chain = false, candidates = 1 } = opts;

  // Multi-candidate generation
  if (candidates > 1) {
    const responses: string[] = [];
    for (let i = 0; i < candidates; i++) {
      try {
        const r = await backend.generate({ system, messages, onToken: () => {} });
        if (r) responses.push(r);
      } catch { continue; }
    }
    if (responses.length > 0) {
      return responses.sort((a, b) => scoreResponse(b, userMessage) - scoreResponse(a, userMessage))[0];
    }
  }

  // Single generation
  const first = await backend.generate({ system, messages, onToken: () => {} });
  if (!first || !chain) return first ?? "";

  // Response chaining: extend with follow-up
  try {
    const followUpSystem = system + "\n\nYou just said: '" + first + "'. Now gently follow up with one short, warm sentence. No new questions — just reflect or validate.";
    const followUp = await backend.generate({ system: followUpSystem, messages, onToken: () => {} });
    if (followUp && followUp.length > 3) {
      return first.trim() + " " + followUp.trim();
    }
  } catch {
    // Chaining failed — return first response as-is
  }

  return first ?? "";
}

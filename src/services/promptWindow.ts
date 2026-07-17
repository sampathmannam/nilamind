// Shared context-window helper used by gemmaPrompt.ts (n_ctx 3072) and qwenPrompt.ts (n_ctx 2048).
// Extracted 2026-07-17 QA pass to remove the byte-identical duplicate windowing/coalescing logic that
// had drifted into both files (they differed only in the n_ctx token budget constant).

/**
 * Coalesce consecutive same-role turns. The shared message store does NOT guarantee strict
 * alternation (an inflection opener + a tapped reply both seed assistant turns; stripping synthetic
 * episode turns can leave two user turns), but chat templates require alternating turns —
 * back-to-back same-role blocks are out-of-distribution and garble the reply.
 */
export function coalesceSameRole<T extends { role: string; content: string }>(msgs: T[]): T[] {
  const merged: T[] = [];
  for (const m of msgs) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else merged.push({ ...m });
  }
  return merged;
}

// Budget math below is in CHARACTERS using a conservative ~3.5 chars/token so we UNDER-estimate the
// token count (safer to truncate a little early than to overflow and have llama.cpp context-shift out
// the persona/§9 prefix).
const CHARS_PER_TOKEN = 3.5;
const REPLY_RESERVE_CHARS = 220 * Math.ceil(CHARS_PER_TOKEN); // reserve the n_predict:220 decode budget
// Fallback system size when the caller doesn't pass the actual prompt (buildNilaSystem ≈ 2300 tokens).
const DEFAULT_SYSTEM_CHARS = 800 * Math.ceil(CHARS_PER_TOKEN); // ~3200 (short persona ~800 tokens)
const MIN_TRANSCRIPT_CHARS = 400; // never starve the transcript below the latest turn's essentials

/**
 * Window the conversation so the FULL prompt (system + transcript + reserved reply) can't overflow
 * n_ctx (nCtxTokens). Keep the seeded greeting (messages[0], the multi-turn primer the role-confusion
 * fix relies on) + the most recent turns that fit the budget, dropping the oldest middle turns.
 *
 * `system` (optional) lets the caller charge the ACTUAL system-prompt size against the budget, so a large
 * system can't silently push the prompt over n_ctx. `maxChars` is an additional hard cap on the transcript.
 * A single oversized latest turn (e.g. a pasted wall of text) is HARD-TRUNCATED — keeping its tail (the most
 * recent words) — so it can never alone blow the window and evict the system/§9 prefix.
 */
export function windowMessagesForCtx(
  messages: { role: "user" | "assistant"; content: string }[],
  nCtxTokens: number,
  maxChars = 5000,
  system?: string,
): { role: "user" | "assistant"; content: string }[] {
  const N_CTX_CHARS = Math.floor(nCtxTokens * CHARS_PER_TOKEN);
  // Transcript char budget: the smaller of the explicit cap and (n_ctx − system − reply reserve).
  const sysChars = system != null ? system.length : DEFAULT_SYSTEM_CHARS;
  const ctxBudget = N_CTX_CHARS - sysChars - REPLY_RESERVE_CHARS;
  const budget = Math.max(MIN_TRANSCRIPT_CHARS, Math.min(maxChars, ctxBudget));

  /** Clamp a single turn to `budget`, keeping its TAIL (the most recent content the user just typed). */
  const clampTurn = (t: { role: "user" | "assistant"; content: string }) =>
    t.content.length > budget ? { ...t, content: t.content.slice(t.content.length - budget) } : t;

  if (messages.length <= 2) {
    // Even a 1–2 turn history can overflow if a single turn is enormous — clamp the latest turn only.
    if (!messages.length) return messages;
    const last = messages[messages.length - 1];
    if (last.content.length <= budget) return messages;
    const copy = messages.slice();
    copy[copy.length - 1] = clampTurn(last);
    return copy;
  }

  const head = messages.slice(0, 1); // the seeded greeting — keep as the primer
  const rest = messages.slice(1);
  const kept: { role: "user" | "assistant"; content: string }[] = [];
  let used = 0;
  for (let i = rest.length - 1; i >= 0; i--) {
    used += rest[i].content.length;
    if (used > budget && kept.length) break; // always keep at least the latest turn
    kept.unshift(rest[i]);
  }
  // Hard-truncate the latest turn if it ALONE still exceeds the budget (a pasted wall of text): keep its
  // tail so the §9/persona prefix survives rather than being context-shifted out.
  if (kept.length && kept[kept.length - 1].content.length > budget) {
    kept[kept.length - 1] = clampTurn(kept[kept.length - 1]);
  }
  return kept.length === rest.length && kept.every((k, i) => k === rest[i])
    ? messages
    : [...head, ...kept];
}

// Pure Gemma-3 prompt construction for the on-device llama.cpp path. Kept SEPARATE from
// llamaCppLlmAdapter.ts (which imports the native llama-cpp-capacitor plugin) so this logic is
// unit-testable in node/vitest without the native binding.
//
// Why a raw prompt STRING and not messages[]: llama-cpp-capacitor v0.1.5's messages[] path calls
// getFormattedChat -> isJinjaSupported(), which destructures `this.model.chatTemplates` — undefined on
// this build -> TypeError, so EVERY generate would throw (and surface as the calm "model not ready"
// fallback). Passing a pre-formatted prompt skips that machinery. The native side tokenizes with
// add_special=true (BOS added automatically — no <bos> here) and parse_special=true (so the
// <start_of_turn>/<end_of_turn> markers tokenize as real special tokens). This is byte-for-byte the
// format V2 was validated under with llama-completion.

import { windowMessagesForCtx, coalesceSameRole } from "./promptWindow";

export type GemmaChatMsg = { role: "user" | "assistant" | "system"; content: string };

/**
 * Gemma-3 has NO system role and its template must START with a user turn. Fold the full system
 * instruction into a synthetic first user turn, preserving the seeded greeting — reproducing the EXACT
 * multi-turn harness V2 was validated under ([system->user "Hi", assistant greeting, user ...]).
 */
export function toGemmaMessages(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): GemmaChatMsg[] {
  const msgs = [...messages];
  const out: GemmaChatMsg[] = [];
  if (msgs.length && msgs[0].role === "assistant") {
    // Seeded greeting is first -> prepend a user turn carrying the system (validated harness shape).
    out.push({ role: "user", content: `${system}\n\nHi` });
    for (const m of msgs) out.push({ role: m.role, content: m.content });
  } else if (msgs.length) {
    // Conversation starts with a user turn -> fold the system into it.
    out.push({ role: "user", content: `${system}\n\n${msgs[0].content}` });
    for (const m of msgs.slice(1)) out.push({ role: m.role, content: m.content });
  } else {
    out.push({ role: "user", content: system });
  }
  // Coalesce consecutive same-role turns. The shared message store does NOT guarantee strict
  // alternation (an inflection opener + a tapped reply both seed assistant turns; stripping synthetic
  // episode turns can leave two user turns), but Gemma's chat template requires alternating user/model —
  // back-to-back same-role blocks are out-of-distribution and garble the reply.
  return coalesceSameRole(out);
}

// Hard context ceiling for the on-device model (llama.cpp n_ctx). Kept in sync with
// llamaCppLlmAdapter.ts (initLlama n_ctx: 4096).

/**
 * Window the conversation so the FULL prompt (system + transcript + reserved reply) can't overflow n_ctx.
 * The system prompt (~2300 tokens) + reserved reply leave only ~1500 tokens (~5–6k chars) for the
 * transcript against n_ctx 4096; an unbounded history would make llama.cpp context-shift and silently drop
 * the persona/§9 prefix. Keep the seeded greeting (messages[0], the multi-turn primer the role-confusion
 * fix relies on) + the most recent turns that fit the budget, dropping the oldest middle turns.
 *
 * `system` (optional) lets the caller charge the ACTUAL system-prompt size against the budget, so a large
 * system can't silently push the prompt over n_ctx. `maxChars` is an additional hard cap on the transcript.
 * A single oversized latest turn (e.g. a pasted wall of text) is HARD-TRUNCATED — keeping its tail (the most
 * recent words) — so it can never alone blow the window and evict the system/§9 prefix.
 */
export function windowMessages(
  messages: { role: "user" | "assistant"; content: string }[],
  maxChars = 5000,
  system?: string,
): { role: "user" | "assistant"; content: string }[] {
  return windowMessagesForCtx(messages, 3072, maxChars, system);
}

/** Render the folded turns into a raw Gemma-3 prompt string (no <bos>; the native tokenizer adds it). */
export function toGemmaPrompt(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): string {
  let out = "";
  for (const t of toGemmaMessages(system, messages)) {
    out += `<start_of_turn>${t.role === "assistant" ? "model" : "user"}\n${t.content}<end_of_turn>\n`;
  }
  return out + "<start_of_turn>model\n"; // cue Nila's reply
}

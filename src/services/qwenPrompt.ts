// Pure Qwen2.5 prompt construction for the on-device llama.cpp path. Mirrors gemmaPrompt.ts but uses
// Qwen's `<|im_start|>` / `<|im_end|>` chat template instead of Gemma's `<start_of_turn>` / `<end_of_turn>`.
// Kept separate from llamaCppLlmAdapter.ts (which imports the native plugin) so this logic is
// unit-testable in node/vitest without the native binding.
//
// Qwen2.5 chat format (no jinja — raw string like the Gemma path, for the same reason):
//   <|im_start|>system
//   {system}<|im_end|>
//   <|im_start|>user
//   {message}<|im_end|>
//   <|im_start|>assistant
//   {reply}<|im_end|>
//   <|im_start|>assistant\n   <-- generation cue

export type QwenChatMsg = { role: "user" | "assistant" | "system"; content: string };

/**
 * Qwen2.5 HAS a system role so the system prompt goes in its own turn (unlike Gemma, which lacks
 * one and must fold it into a user turn). Messages follow standard alternating roles, with coalescing
 * of consecutive same-role turns (same defensive reasoning as Gemma — the shared message store may
 * produce non-alternating sequences).
 */
export function toQwenMessages(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): QwenChatMsg[] {
  const out: QwenChatMsg[] = [{ role: "system", content: system }];
  for (const m of messages) {
    out.push({ role: m.role, content: m.content });
  }
  const merged: QwenChatMsg[] = [];
  for (const m of out) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else merged.push({ ...m });
  }
  return merged;
}

// Hard context ceiling for Qwen (llama.cpp n_ctx). Budget math in CHARACTERS at ~3.5 chars/token,
// UNDER-estimating the token count (safer to truncate early than overflow n_ctx).
const N_CTX_TOKENS = 2048;
const CHARS_PER_TOKEN = 3.5;
const N_CTX_CHARS = Math.floor(N_CTX_TOKENS * CHARS_PER_TOKEN); // ~7168
const REPLY_RESERVE_CHARS = 220 * Math.ceil(CHARS_PER_TOKEN); // reserve n_predict:220 decode budget
const DEFAULT_SYSTEM_CHARS = 800 * Math.ceil(CHARS_PER_TOKEN); // ~3200 (short persona ~800 tokens)
const MIN_TRANSCRIPT_CHARS = 400;

/**
 * Window the conversation so the FULL prompt (system + transcript + reserved reply) can't overflow
 * n_ctx. Identical logic to gemmaPrompt's windowMessages but using Qwen's n_ctx=2048 constants.
 */
export function windowQwenMessages(
  messages: { role: "user" | "assistant"; content: string }[],
  maxChars = 5000,
  system?: string,
): { role: "user" | "assistant"; content: string }[] {
  const sysChars = system != null ? system.length : DEFAULT_SYSTEM_CHARS;
  const ctxBudget = N_CTX_CHARS - sysChars - REPLY_RESERVE_CHARS;
  const budget = Math.max(MIN_TRANSCRIPT_CHARS, Math.min(maxChars, ctxBudget));

  const clampTurn = (t: { role: "user" | "assistant"; content: string }) =>
    t.content.length > budget ? { ...t, content: t.content.slice(t.content.length - budget) } : t;

  if (messages.length <= 2) {
    if (!messages.length) return messages;
    const last = messages[messages.length - 1];
    if (last.content.length <= budget) return messages;
    const copy = messages.slice();
    copy[copy.length - 1] = clampTurn(last);
    return copy;
  }

  const head = messages.slice(0, 1);
  const rest = messages.slice(1);
  const kept: { role: "user" | "assistant"; content: string }[] = [];
  let used = 0;
  for (let i = rest.length - 1; i >= 0; i--) {
    used += rest[i].content.length;
    if (used > budget && kept.length) break;
    kept.unshift(rest[i]);
  }
  if (kept.length && kept[kept.length - 1].content.length > budget) {
    kept[kept.length - 1] = clampTurn(kept[kept.length - 1]);
  }
  return kept.length === rest.length && kept.every((k, i) => k === rest[i])
    ? messages
    : [...head, ...kept];
}

/** Render the folded turns into a raw Qwen2.5 prompt string using `<|im_start|>` / `<|im_end|>` tokens. */
export function toQwenPrompt(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): string {
  let out = "";
  for (const t of toQwenMessages(system, messages)) {
    out += `<|im_start|>${t.role}\n${t.content}<|im_end|>\n`;
  }
  return out + "<|im_start|>assistant\n";
}

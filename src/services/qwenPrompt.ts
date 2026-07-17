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

import { windowMessagesForCtx, coalesceSameRole } from "./promptWindow";

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
  return coalesceSameRole(out);
}

// Hard context ceiling for Qwen (llama.cpp n_ctx).

/**
 * Window the conversation so the FULL prompt (system + transcript + reserved reply) can't overflow
 * n_ctx. Identical logic to gemmaPrompt's windowMessages but using Qwen's n_ctx=2048 constants.
 */
export function windowQwenMessages(
  messages: { role: "user" | "assistant"; content: string }[],
  maxChars = 5000,
  system?: string,
): { role: "user" | "assistant"; content: string }[] {
  return windowMessagesForCtx(messages, 2048, maxChars, system);
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

// ─── Qwen3 (non-thinking) ────────────────────────────────────────────────────
// Qwen3 is a HYBRID thinking model. For the companion chat we always run it in NON-thinking mode:
// the official hard switch (enable_thinking=false in the HF chat template) renders the assistant
// generation cue PREFILLED with an empty <think></think> block, and the model then answers directly
// (Qwen3 model card → "Switching Between Thinking and Non-Thinking Mode"). We mirror that exact
// rendering in the raw-prompt path. Thinking mode is deliberately NOT offered: hidden reasoning
// would burn the token budget (slow CPU decode) and could leak deliberation into a companion reply.
const QWEN3_NOTHINK_PREFILL = "<think>\n\n</think>\n\n";

/** Render a raw Qwen3 ChatML prompt with the empty-think (non-thinking) assistant prefill. */
export function toQwen3Prompt(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): string {
  return toQwenPrompt(system, messages) + QWEN3_NOTHINK_PREFILL;
}

/**
 * Strip <think>…</think> blocks a Qwen3 model may still emit despite the non-thinking prefill.
 * FAIL-CLOSED on an UNCLOSED block: everything from the dangling <think> onward is dropped, because
 * leaked hidden reasoning must never be shown as Nila's reply (it can contain raw deliberation about
 * the user's state that was never meant to be read).
 */
export function stripThinkBlocks(text: string): string {
  let out = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  const dangling = out.indexOf("<think>");
  if (dangling !== -1) out = out.slice(0, dangling);
  return out.trim();
}

// Daily journal reflective prompt — Free write / Gratitude modes.
//
// Evidence basis (see deep-research synthesis, 2026-07-16): expressive-writing benefit is
// concentrated among writers who go deeper/longer and among acceptance-framed instructions (Rude et
// al. 2012), not among shallow daily taps. A single well-chosen, specific prompt is the cheapest way
// to nudge a user toward that depth without turning the diary into a lecture. We ask the on-device
// model for ONE short, concrete, acceptance-oriented question grounded in the user's own recent
// durable insights (never raw entry text — insightsContextBlock() is already the derived, vetted
// summary the reflection job maintains), and fall back to a hand-written static bank when the model
// isn't loaded yet or hangs, so the feature never blocks on generation.
//
// Fully on-device: generateOnDevice never routes to the cloud tier (see localLlm.ts), so a prompt
// derived from the user's insights never leaves the device. Cached once per calendar day + mode in
// plain localStorage — this is a *question Nila is asking*, not user content, so it isn't sensitive,
// and caching keeps the UI stable across re-renders/app reopens on the same day.

import { generateOnDevice, isLocalLlmReady } from "./localLlm";
import { insightsContextBlock } from "./nilaInsights";
import { ls } from "./storageUtils";

export type JournalMode = "free" | "gratitude";

const CACHE_KEY = "nilamind_journal_prompt_cache";

const FREE_PROMPTS = [
  "What's one thing today that felt heavier than it should have — and what would it look like to set it down, even for a minute?",
  "Is there a feeling you've been pushing past today? What happens if you just let it be there, without fixing it?",
  "What's something you didn't say out loud today that you wish you had?",
  "Think of a moment today that surprised you. What did it show you about where you're at right now?",
  "What's one thing you're carrying into tomorrow that you'd rather leave behind today?",
  "If today had a single honest sentence, what would it be?",
  "What's something you needed today that you didn't ask for?",
];

const GRATITUDE_PROMPTS = [
  "Name three specific things from today — not \"my family\" or \"my health\", but a moment, a sentence, a small thing that actually happened.",
  "What's something small someone did today that you almost didn't notice?",
  "What's one thing about today that you'd want to remember a year from now?",
  "What's something ordinary today that you'd miss if it were gone?",
  "Who or what made today 5% easier than it could have been?",
];

function bankFor(mode: JournalMode): string[] {
  return mode === "gratitude" ? GRATITUDE_PROMPTS : FREE_PROMPTS;
}

/** PURE. Deterministic pick so the same (date, mode) always resolves to the same static prompt
 *  within a session, without needing Math.random (kept test-friendly and reproducible). */
export function pickStaticPrompt(mode: JournalMode, dateKey: string): string {
  const bank = bankFor(mode);
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  return bank[hash % bank.length];
}

interface PromptCache { date: string; free?: string; gratitude?: string }

function readCache(): PromptCache | null {
  try {
    const raw = ls()?.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as PromptCache) : null;
  } catch {
    return null;
  }
}

function writeCache(next: PromptCache): void {
  try { ls()?.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* best-effort */ }
}

const SYSTEM_FREE =
  "You are Nila, offering ONE short, warm, specific journaling prompt for today. Ground it in the " +
  "person's own recent context if given. Write it as a single, direct, second-person question, under " +
  "30 words, that invites them to explore something real rather than log a quick mood. Do not diagnose, " +
  "do not lecture, no lists, no preamble — return ONLY the question itself.";

const SYSTEM_GRATITUDE =
  "You are Nila, offering ONE short gratitude-journaling prompt for today. Write a single, direct, " +
  "second-person instruction under 30 words that asks for something SPECIFIC and concrete from today " +
  "(a moment, a sentence, a small thing) rather than a generic category. No lists, no preamble — return " +
  "ONLY the prompt itself.";

/** Today's reflective prompt for the given mode. Tries the on-device model once, grounded in the
 *  user's durable insights context; falls back to a static, hand-written prompt (deterministic per
 *  day) if no model is loaded or generation fails/hangs. Cached per calendar day + mode. */
export async function getDailyPrompt(mode: JournalMode, today: string = new Date().toISOString().split("T")[0]): Promise<string> {
  const cache = readCache();
  if (cache?.date === today && cache[mode]) return cache[mode] as string;

  const fallback = pickStaticPrompt(mode, `${today}:${mode}`);

  if (!isLocalLlmReady()) {
    writeCache({ ...(cache?.date === today ? cache : { date: today }), [mode]: fallback });
    return fallback;
  }

  try {
    const context = insightsContextBlock();
    const system = mode === "gratitude" ? SYSTEM_GRATITUDE : SYSTEM_FREE;
    const userMsg = context
      ? `A little context about them (private, on-device):\n${context}\n\nGive today's prompt.`
      : "No context yet — give today's prompt.";
    const reply = await generateOnDevice(system, [{ role: "user", content: userMsg }]);
    const prompt = reply?.trim() || fallback;
    writeCache({ ...(cache?.date === today ? cache : { date: today }), [mode]: prompt });
    return prompt;
  } catch {
    writeCache({ ...(cache?.date === today ? cache : { date: today }), [mode]: fallback });
    return fallback;
  }
}

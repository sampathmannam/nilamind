/**
 * Worry → problem-solving structure (NILA_COMPLETE_AGENT §B, "toolkit without forms"). The person just
 * described a worry in chat; instead of a blank problem-solving form, Nila drafts ONE crisp, solvable
 * problem statement from their words and opens the tool pre-filled at the "define" step. The user edits it
 * and brainstorms the solutions themselves — the model does the framing (where people stall), NOT the
 * solving (the generation effect is the therapeutic value).
 *
 * Mirrors thoughtRecordDraft.ts: §9-gated (a crisis disclosure never reaches the model — surface crisis
 * help instead), output-safety-gated, fail-open. 100% on-device.
 */
import { generateOnDevice } from "./localLlm";
import { applyOutputSafety } from "./nilaSafetyGate";
import { scanForCrisis } from "../safety";

const PS_SYSTEM_PROMPT = `You are Nila, helping someone turn a worry into something they can actually work on. The person just described a worry or problem. Rewrite it as ONE clear, specific, solvable problem statement — the kind you can brainstorm concrete solutions for. Keep it in their own words and their situation.

Do NOT add solutions, advice, reassurance, or diagnosis. Do NOT invent details they didn't say.

Reply with ONLY the problem statement: one sentence, concrete. If there is no solvable problem in what they said — it's a feeling to sit with, a grief, or something outside their control, not a problem to solve — reply with exactly: NONE`;

/** Draft a one-sentence problem statement from a worry, or null if there's nothing solvable / the model
 *  is unavailable. Output-safety-gated. */
export async function draftProblemStatement(worryText: string): Promise<string | null> {
  const reply = await generateOnDevice(PS_SYSTEM_PROMPT, [{ role: "user", content: worryText }]);
  if (!reply) return null;
  const safe = applyOutputSafety(reply, worryText, true).trim();
  if (!safe || /^none\b/i.test(safe)) return null;
  return safe.replace(/^["']+|["']+$/g, "").trim().slice(0, 200);
}

export type SafeProblemDraftResult =
  | { ok: true; problem: string }
  | { ok: false; reason: "crisis" | "empty" };

/**
 * §9-gated auto-draft from a worry. A crisis disclosure never reaches the on-device model; the caller
 * surfaces crisis help instead. Returns the problem statement, an empty reason, or a crisis flag.
 */
export async function safeDraftProblem(worryText: string): Promise<SafeProblemDraftResult> {
  const v = worryText.trim();
  if (!v) return { ok: false, reason: "empty" };
  if (scanForCrisis(v)) return { ok: false, reason: "crisis" };
  const problem = await draftProblemStatement(v);
  if (!problem) return { ok: false, reason: "empty" };
  return { ok: true, problem };
}

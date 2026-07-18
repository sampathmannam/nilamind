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

const PS_SYSTEM_PROMPT = `You are Nila. The person described a worry. FIRST decide: is there a concrete, SOLVABLE problem here —
something they could actually take a step on — or is it a feeling to sit with, a grief, or something outside
their control?

Set "solvable" to true or false. If true, write ONE clear, specific problem statement in "problem" (their
situation, in their words — no advice, no solutions, no reassurance, no diagnosis, no invented details). If
false, leave "problem" as an empty string.

Examples:
- "i can't decide whether to move closer to work" -> solvable true
- "i keep missing deadlines and don't know how to keep up" -> solvable true
- "i miss my grandmother so much since she passed" -> solvable false
- "i'm just so tired of everything" -> solvable false

Output JSON only: {"solvable": true or false, "problem": "..."}`;

const PS_DRAFT_SCHEMA = {
  type: "object",
  properties: { solvable: { type: "boolean" }, problem: { type: "string" } },
  required: ["solvable", "problem"],
} as const;

/** Draft a one-sentence problem statement from a worry, or null if there's nothing SOLVABLE (a feeling /
 *  grief / uncontrollable thing — the model sets solvable=false, far more reliable in a small model than a
 *  "reply NONE" instruction) or the model is unavailable. Output-safety-gated. */
export async function draftProblemStatement(worryText: string): Promise<string | null> {
  let raw: string | null;
  try {
    raw = await generateOnDevice(PS_SYSTEM_PROMPT, [{ role: "user", content: worryText }], () => {}, undefined, {
      jsonSchema: PS_DRAFT_SCHEMA as unknown as object,
    });
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: { solvable?: unknown; problem?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed.solvable !== true || typeof parsed.problem !== "string") return null;
  const problem = parsed.problem.trim();
  if (!problem) return null; // solvable but empty — guard before applyOutputSafety (which returns a fallback on "")
  const safe = applyOutputSafety(problem, worryText, true).trim().replace(/^["']+|["']+$/g, "").trim();
  return safe ? safe.slice(0, 200) : null;
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

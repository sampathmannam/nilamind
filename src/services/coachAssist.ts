// §9-gated bridge for the three screens that call the on-device model DIRECTLY — the CBT Thought Record
// ("Ask Nila" balanced thought), the DBT Diary quick-note ("Ask Nila"), and the Dashboard deep
// assessment. Every entry crisis-scans the user's free text with detectCrisis BEFORE any network
// egress: on a hit it returns { crisis: true } and makes ZERO model calls, so crisis text never
// leaves the device and the crisis decision never depends on the model — the same invariant the
// companion/episode pipeline (sendToNila) enforces. detectCrisis is the keyword floor OR (once enabled)
// the on-device semantic classifier, so euphemistic crises the keyword list misses are also caught;
// it is fail-closed (any classifier error degrades to the keyword result). Screens render the
// deterministic crisis surface (getCrisisReply + CrisisLines) on a crisis result. Nothing here is persisted.
import { generateOnDevice, isLocalLlmReady } from "./localLlm";
import { detectCrisis } from "./crisisClassifier";
import { applyOutputSafety } from "./nilaSafetyGate";

/** Recursively collect every string leaf value from a logs object and join with single spaces — so the
 *  §9 scan runs over the user's raw prose (across all records/fields), NOT JSON punctuation/escapes that
 *  would break a multi-word crisis phrase. Combined with scanForCrisis's whitespace normalization this
 *  catches phrases that contain newlines or sit in different fields. */
function collectText(value: unknown, acc: string[] = []): string[] {
  if (typeof value === "string") acc.push(value);
  else if (Array.isArray(value)) for (const v of value) collectText(v, acc);
  else if (value && typeof value === "object") for (const v of Object.values(value)) collectText(v, acc);
  return acc;
}

// Flat discriminated unions (plain object literals so `if (r.crisis) return;` narrows correctly —
// a generic `{crisis:false} & T` intersection does not narrow under tsc).
export type CrisisBlocked = { crisis: true };
const CRISIS: CrisisBlocked = { crisis: true };

// MODEL-NOT-READY sentinel (QA v1.1 #10). Every first-run user has no on-device model yet
// (generateOnDevice returns null → the old code threw, which the screens surfaced as a generic
// "couldn't reach Nila" error — a dead end that hid *why*). Instead we short-circuit BEFORE the model
// call with a DISTINGUISHABLE, backward-compatible not-ready result: it keeps the { crisis: false }
// shape and puts the copy in reply/analysis, so EXISTING call sites (which read result.reply /
// result.analysis on crisis===false) render this purpose-built message with no code change and never
// misfire the crisis branch. Updated call sites can additionally detect it via `notReady === true`
// (or by comparing the text to MODEL_NOT_READY_MESSAGE) to render bespoke "brain still downloading" UI.
export const MODEL_NOT_READY_MESSAGE =
  "Nila's brain is still downloading (a one-time setup) — your entry is saved. You can write your own for now, or come back once she's ready.";

export type BalancedThoughtResult =
  | CrisisBlocked
  | { crisis: false; reply: string; notReady?: boolean };
export type QuickNoteResult =
  | CrisisBlocked
  | { crisis: false; analysis: string; tags: string[]; notReady?: boolean };
export type DeepAssessmentResult =
  | CrisisBlocked
  | { crisis: false; reply: string; notReady?: boolean };

export interface BalancedThoughtInput {
  situation: string;
  feeling: string;
  automaticThought: string;
  beliefPercent: number;
  selectedTraps: string[];
}

/** CBT Thought Record assist. Scans every distress-bearing free-text field the user entered for this
 *  record (situation, feeling, automatic thought) before sending — a crisis disclosure in any of them
 *  blocks the model call. */
export async function fetchBalancedThought(
  input: BalancedThoughtInput,
): Promise<BalancedThoughtResult> {
  const scanned = [input.situation, input.feeling, input.automaticThought].join(" ");
  if (await detectCrisis(scanned)) return CRISIS;

  // No on-device model yet (first-run) → return the not-ready sentinel instead of a dead-end error.
  if (!isLocalLlmReady()) return { crisis: false, reply: MODEL_NOT_READY_MESSAGE, notReady: true };

  const userInstructions = `
Situation: ${input.situation}
Automatic Unwanted Thought: ${input.automaticThought}
Belief Level: ${input.beliefPercent}%
Potential cognitive thinking traps detected: ${input.selectedTraps.join(", ") || "None selected"}

Provide a short, gentle, and objective alternative / balanced perspective (under 3 or 4 sentences). Do not validate the cognitive distortion, but validate the pain and emotions. Encourage opposite action or self-compassion.
    `;

  const reply = await generateOnDevice(
    "You are Nila, guiding the user into reframing an unwanted thought pattern. Keep responses short, objective, gentle and direct.",
    [{ role: "user", content: userInstructions }],
  );
  // Ready but generation failed/hung mid-call (OOM/cancel/hang-timeout) — a transient error, not
  // "not ready" (that was handled above). The screen's catch shows a retry-able "couldn't reach Nila".
  if (reply === null) throw new Error("Nila's on-device reply failed. Please try again.");
  // §9 output gate: an unsafe model reply (e.g. validating a distortion) is replaced by the safe
  // fallback before the screen shows it — same gate the companion/episode path runs.
  return { crisis: false, reply: applyOutputSafety(reply, scanned, true) };
}

/** DBT Diary quick-note assist. Scans the note before sending. */
export async function analyzeQuickNote(note: string): Promise<QuickNoteResult> {
  if (await detectCrisis(note)) return CRISIS;

  // No on-device model yet (first-run) → not-ready sentinel (backward-compatible; screen shows the copy).
  if (!isLocalLlmReady()) return { crisis: false, analysis: MODEL_NOT_READY_MESSAGE, tags: [], notReady: true };

  const analysis = await generateOnDevice(
    "You are Nila. In 2-3 warm, plain sentences, gently reflect what this short diary note suggests — name the feeling, validate it, offer one small kind observation. Do not diagnose. No lists.",
    [{ role: "user", content: note }],
  );
  // Ready but generation failed/hung mid-call — transient (not-ready handled above). Screen catch retries.
  if (analysis === null) throw new Error("Nila's on-device reply failed. Please try again.");
  // §9 output gate on the model's analysis text. Tags came from a cloud step that's gone; empty now.
  return {
    crisis: false,
    analysis: applyOutputSafety(analysis, note, true),
    tags: [],
  };
}

export interface DeepAssessmentLogs {
  checkins: unknown[];
  diaryEntries: unknown[];
  episodes: unknown[];
}

/** Dashboard deep-assessment. The logs replayed here contain stored free text (check-in context,
 *  diary quickNotes/morningIntention, episode triggers); scan ALL of it (every string leaf via
 *  collectText, not the JSON blob) before sending so a past crisis disclosure can't reach the model
 *  ungated. */
export async function runDeepAssessment(logs: DeepAssessmentLogs): Promise<DeepAssessmentResult> {
  const payloadText = JSON.stringify(logs); // sent to the model — structure helps the analysis
  const scanned = collectText(logs).join(" "); // §9 scan over raw prose, not JSON punctuation/escapes
  // detectCrisis (keyword floor OR semantic classifier) over ALL replayed stored free text — a past
  // euphemistic crisis disclosure the keyword list would miss now blocks the model call too.
  if (await detectCrisis(scanned)) return CRISIS;

  // No on-device model yet (first-run) → not-ready sentinel (backward-compatible; screen shows the copy).
  if (!isLocalLlmReady()) return { crisis: false, reply: MODEL_NOT_READY_MESSAGE, notReady: true };

  const reply = await generateOnDevice(
    "You are Nila, the NilaMind on-device coach. You evaluate the local user logs (check-ins, diary cards, BPD episode records) to provide 3 specific, deeply analytical, and actionable insights about their emotional triggers, coping skill efficacy, or lifestyle factors. BE COMPASSIONATE but strictly analytical. Do NOT diagnose. No fluff. Use markdown with bullet points and appropriate emojis to convey warmth.",
    [{ role: "user", content: `Please analyze my local behavioral logs and give me 3 deep insights. Data: ${payloadText}` }],
  );
  // Ready but generation failed/hung mid-call — transient (not-ready handled above). Screen catch retries.
  if (reply === null) throw new Error("Nila's on-device reply failed. Please try again.");
  return { crisis: false, reply: applyOutputSafety(reply, scanned, true) };
}

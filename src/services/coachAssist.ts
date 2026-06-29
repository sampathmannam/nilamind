// §9-gated bridge for the three screens that call the on-device model DIRECTLY — the CBT Thought Record
// ("Ask Nila" balanced thought), the DBT Diary quick-note ("Ask Nila"), and the Dashboard deep
// assessment. Every entry crisis-scans the user's free text with scanForCrisis BEFORE any network
// egress: on a hit it returns { crisis: true } and makes ZERO fetch calls, so crisis text never
// leaves the device and the crisis decision never depends on the model — the same invariant the
// companion/episode pipeline (sendToNila) enforces. Screens render the deterministic crisis surface
// (getCrisisReply + CrisisLines) on a crisis result. Nothing here is persisted.
import { generateOnDevice } from "./localLlm";
import { scanForCrisis } from "../safety";
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

export type BalancedThoughtResult = CrisisBlocked | { crisis: false; reply: string };
export type QuickNoteResult = CrisisBlocked | { crisis: false; analysis: string; tags: string[] };
export type DeepAssessmentResult = CrisisBlocked | { crisis: false; reply: string };

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
  if (scanForCrisis(scanned)) return CRISIS;

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
  if (reply === null) throw new Error("Nila's on-device model isn't ready yet.");
  // §9 output gate: an unsafe model reply (e.g. validating a distortion) is replaced by the safe
  // fallback before the screen shows it — same gate the companion/episode path runs.
  return { crisis: false, reply: applyOutputSafety(reply, scanned, true) };
}

/** DBT Diary quick-note assist. Scans the note before sending. */
export async function analyzeQuickNote(note: string): Promise<QuickNoteResult> {
  if (scanForCrisis(note)) return CRISIS;

  const analysis = await generateOnDevice(
    "You are Nila. In 2-3 warm, plain sentences, gently reflect what this short diary note suggests — name the feeling, validate it, offer one small kind observation. Do not diagnose. No lists.",
    [{ role: "user", content: note }],
  );
  if (analysis === null) throw new Error("Nila's on-device model isn't ready yet.");
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
  if (scanForCrisis(scanned)) return CRISIS;

  const reply = await generateOnDevice(
    "You are Nila, the NilaMind on-device coach. You evaluate the local user logs (check-ins, diary cards, BPD episode records) to provide 3 specific, deeply analytical, and actionable insights about their emotional triggers, coping skill efficacy, or lifestyle factors. BE COMPASSIONATE but strictly analytical. Do NOT diagnose. No fluff. Use markdown with bullet points and appropriate emojis to convey warmth.",
    [{ role: "user", content: `Please analyze my local behavioral logs and give me 3 deep insights. Data: ${payloadText}` }],
  );
  if (reply === null) throw new Error("Nila's on-device model isn't ready yet."); // no model => the screen shows its error
  return { crisis: false, reply: applyOutputSafety(reply, scanned, true) };
}

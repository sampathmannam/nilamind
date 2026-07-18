/**
 * Conversational check-in capture — "the whole toolkit without forms" (NILA_COMPLETE_AGENT §B).
 *
 * The person is already telling Nila how they feel in chat; don't make them re-enter it in a 6-tap mood
 * form. The on-device model reads the conversation it already has and DRAFTS a check-in (mood · intensity
 * · energy · context · granular emotion), constrained to the exact vocabulary the manual form uses, so the
 * draft maps cleanly onto the check-in store. The user then CONFIRMS with one tap (SENSE → ASK → CONFIRM →
 * ACT, never sensor → alarm — NILA_AGENT_DESIGN §0).
 *
 * Rails: never auto-saves (always a confirm card); only offered when no check-in is logged today; §9-gated
 * (never drafts from a crisis conversation — mirrors runAsyncReflection); fail-open (model absent / low
 * confidence / parse error → null → the normal form still works). 100% on-device; nothing leaves the phone.
 */
import { generateOnDevice, isLocalLlmReady } from "./localLlm";
import { detectCrisis } from "./crisisClassifier";
import { secureLocal } from "./secureLocal";
import { localDateKey } from "./storageUtils";
import { hasCheckinToday, buildCheckinEntry, appendCheckin } from "./checkin";
import { MOOD_CHIPS, INTENSITY_CHIPS, ENERGY_CHIPS, CONTEXT_TAGS } from "./nilaCheckinReducer";

const DRAFT_KEY = "nilamind_checkin_draft"; // SENSITIVE_KEY — encrypted via secureLocal

/** Only surface a draft we're reasonably sure about — a wrong pre-fill is worse than none (the user then
 *  has to notice AND correct it). Below this, stay silent and let them use the normal form. */
const MIN_CONFIDENCE = 0.55;
/** Need at least this many user turns before there's enough to read a state from. */
const MIN_TURNS = 2;

const INTENSITY_VALUES = INTENSITY_CHIPS.map((c) => c.value);       // [3,5,7,9]
const ENERGY_VALUES = ENERGY_CHIPS.map((c) => c.value);             // [1,2,3,4]

export interface CheckinDraftProposal {
  mood: string;            // one of MOOD_CHIPS
  intensity: number;       // one of INTENSITY_VALUES
  energy: number;          // one of ENERGY_VALUES
  contextTag: string;      // one of CONTEXT_TAGS
  granularEmotion?: string;
  confidence: number;
  date: string;            // localDateKey when drafted
  dismissed?: boolean;
}

/** GBNF-constrained structured output — the model may ONLY return values that map onto the manual form,
 *  so nothing is hallucinated into the check-in store. */
export const CHECKIN_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    expressedFeeling: { type: "boolean" },
    mood: { type: "string", enum: [...MOOD_CHIPS] },
    intensity: { type: "integer", enum: [...INTENSITY_VALUES] },
    energy: { type: "integer", enum: [...ENERGY_VALUES] },
    contextTag: { type: "string", enum: [...CONTEXT_TAGS] },
    granularEmotion: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["expressedFeeling", "mood", "intensity", "energy", "contextTag", "confidence"],
} as const;

function draftSystemPrompt(): string {
  return `You are Nila. Read the person's recent messages and infer how they seem to be feeling RIGHT NOW,
so the app can offer to log a check-in FOR them instead of making them fill in a form.

Only infer a feeling they actually expressed or clearly implied. If the messages are just logistics,
questions, or small talk with no feeling in them, set "expressedFeeling" to false and set confidence low.

Pick the CLOSEST option for each field from the allowed values. "intensity": 3 gentle, 5 noticeable,
7 strong, 9 intense. "energy": 1 very low, 2 low, 3 moderate, 4 high. "granularEmotion" is one precise
feeling word if there is one (e.g. "disappointed", "restless"), else omit it. "confidence" is 0-1: how
sure you are this reflects their current state.

Never diagnose. Never invent a feeling they did not show. Output JSON only.`;
}

/** Snap a value to the nearest allowed option (the GBNF enum should already guarantee this, but text
 *  backends that ignore the schema might not). */
function nearest(value: number, allowed: number[]): number {
  return allowed.reduce((best, v) => (Math.abs(v - value) < Math.abs(best - value) ? v : best), allowed[0]);
}

/** Validate + clamp a raw model object into a proposal, or null if it isn't a usable, confident draft. */
export function parseDraft(raw: unknown, date: string): CheckinDraftProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.expressedFeeling === false) return null;

  const mood = typeof o.mood === "string" ? o.mood : "";
  if (!MOOD_CHIPS.includes(mood)) return null; // must map onto the form; no hallucinated moods

  const confidence = typeof o.confidence === "number" ? o.confidence : 0;
  if (confidence < MIN_CONFIDENCE) return null;

  const intensity = nearest(typeof o.intensity === "number" ? o.intensity : 5, INTENSITY_VALUES);
  const energy = nearest(typeof o.energy === "number" ? o.energy : 3, ENERGY_VALUES);
  const contextTag = typeof o.contextTag === "string" && CONTEXT_TAGS.includes(o.contextTag)
    ? o.contextTag
    : "Not sure";
  const granular = typeof o.granularEmotion === "string"
    ? o.granularEmotion.replace(/\s+/g, " ").trim().slice(0, 40)
    : "";

  return {
    mood,
    intensity,
    energy,
    contextTag,
    granularEmotion: granular || undefined,
    confidence,
    date,
  };
}

/** Draft a check-in from conversation turns. §9-gated, fail-open. Returns null when there's nothing
 *  confident to offer. */
export async function draftCheckinFromConversation(turns: string[]): Promise<CheckinDraftProposal | null> {
  const clean = turns.map((t) => (t || "").trim()).filter(Boolean);
  if (clean.length < MIN_TURNS) return null;

  // Never read a state out of a crisis conversation — the §9 surface owns that moment, not a mood log.
  const allText = clean.join(" ");
  try {
    if (await detectCrisis(allText)) return null;
  } catch { return null; } // fail-closed on the safety scan specifically

  const digest = clean.slice(-8).map((t) => `They said: "${t}"`).join("\n");
  let raw: string | null;
  try {
    raw = await generateOnDevice(draftSystemPrompt(), [{ role: "user", content: digest }], () => {}, undefined, {
      jsonSchema: CHECKIN_DRAFT_SCHEMA as unknown as object,
    });
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return parseDraft(parsed, localDateKey());
}

export function savePendingCheckinDraft(p: CheckinDraftProposal): void {
  try { secureLocal.setItem(DRAFT_KEY, JSON.stringify(p)); } catch { /* best-effort */ }
}

/** The pending draft for today, if one exists and hasn't been dismissed. */
export function getPendingCheckinDraft(): CheckinDraftProposal | null {
  try {
    const raw = secureLocal.getItem(DRAFT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as CheckinDraftProposal;
    if (p.date !== localDateKey() || p.dismissed) return null;
    return p;
  } catch {
    return null;
  }
}

export function dismissCheckinDraftToday(): void {
  const p = getPendingCheckinDraft();
  if (p) savePendingCheckinDraft({ ...p, dismissed: true });
}

export function clearPendingCheckinDraft(): void {
  try { secureLocal.removeItem(DRAFT_KEY); } catch { /* best-effort */ }
}

/** Commit a confirmed draft to the real check-in store (provenance-tagged "(Nila)" like every Nila
 *  check-in), then clear the pending draft. */
export function confirmCheckinDraft(p: CheckinDraftProposal): void {
  appendCheckin(buildCheckinEntry(p.mood, p.intensity, p.contextTag, p.granularEmotion ?? null, p.energy));
  clearPendingCheckinDraft();
}

/** Deterministic, human-readable summary of a draft for the confirm card (NOT model prose — keeps §9 out
 *  of the surfaced text and the wording stable). */
export function summarizeDraft(p: CheckinDraftProposal): string {
  const strength = INTENSITY_CHIPS.find((c) => c.value === p.intensity)?.label.toLowerCase() ?? "";
  const feeling = p.granularEmotion ? `${p.mood.toLowerCase()} — ${p.granularEmotion}` : p.mood.toLowerCase();
  const about = p.contextTag && p.contextTag !== "Not sure" ? `, around ${p.contextTag.toLowerCase()}` : "";
  return `Sounds like you're feeling ${feeling}${strength ? ` (${strength})` : ""}${about}.`;
}

/** Best-effort background attempt to draft today's check-in from the current session. Guarded so it never
 *  nags: only when the model is ready, no check-in is logged yet today, and nothing is already pending or
 *  dismissed for today. Safe to call on app foreground alongside runAsyncReflection. */
export async function maybeDraftCheckin(turns: string[]): Promise<void> {
  if (!isLocalLlmReady()) return;
  if (hasCheckinToday(localDateKey())) return;
  try {
    const existing = secureLocal.getItem(DRAFT_KEY);
    if (existing) {
      const p = JSON.parse(existing) as CheckinDraftProposal;
      if (p.date === localDateKey()) return; // already drafted (or dismissed) today — don't re-offer
    }
  } catch { /* fall through and try */ }

  const proposal = await draftCheckinFromConversation(turns);
  if (proposal) savePendingCheckinDraft(proposal);
}

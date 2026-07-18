/**
 * Conversation → safety-plan draft (NILA_COMPLETE_AGENT §B, "safety-plan builder from conversation").
 * The LAST and most §9-adjacent capture, so the rails are the strictest in the app:
 *
 *  1. The model may draft ONLY the four personal-coping fields — warning signs, things that help alone,
 *     distracting places/activities, and making the space safer — all from the person's OWN words.
 *  2. It NEVER touches `trustedPeople` (real names + phone numbers — a fabricated crisis contact is a
 *     genuine harm) or `professionals` (crisis hotlines are hardcoded + version-checked per the §9 rail,
 *     never model-generated). Those fields the person fills themselves.
 *  3. §9-gated INPUT: an active-crisis message never reaches the model — the caller surfaces crisis help.
 *  4. Fail-CLOSED OUTPUT: if the drafted content itself trips the crisis scanner, the whole draft is
 *     dropped (the model must not inject means/SI into a safety plan).
 *  5. NEVER auto-saved: the draft only pre-fills EMPTY fields on the screen; the person reviews and edits
 *     every field and saves explicitly. Nothing is persisted here.
 *
 * 100% on-device. Fail-open to a blank safety plan on any absence/error.
 */
import { generateOnDevice } from "./localLlm";
import { scanForCrisis } from "../safety";

export interface SafetyPlanDraftFields {
  warningSigns: string;
  internalCoping: string;
  socialDistractors: string;
  safeEnvironment: string;
}

const FIELD_KEYS: (keyof SafetyPlanDraftFields)[] = [
  "warningSigns",
  "internalCoping",
  "socialDistractors",
  "safeEnvironment",
];

export const SAFETY_PLAN_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    warningSigns: { type: "string" },
    internalCoping: { type: "string" },
    socialDistractors: { type: "string" },
    safeEnvironment: { type: "string" },
  },
  required: ["warningSigns", "internalCoping", "socialDistractors", "safeEnvironment"],
} as const;

function draftSystemPrompt(): string {
  return `You are Nila, helping someone start a safety plan from what they've already told you. Using ONLY their
own words, draft these four fields:

- warningSigns: the personal signs that things are starting to get hard for THEM (as they described)
- internalCoping: things THEY said help them cope on their own
- socialDistractors: places, settings, or activities that distract or soothe them (NOT people to call)
- safeEnvironment: anything they mentioned about making their space safer or stepping away from what's risky

Rules:
- Use ONLY what they actually said. Never invent signs, strategies, activities, people, or phone numbers.
- Do NOT include any crisis hotlines, professional contacts, or any person's name or number — those are
  added separately, by them.
- If a field has nothing from their words, make it an empty string "".
This is a DRAFT they will read, edit, and save themselves. Output JSON only.`;
}

/** Validate/clamp raw model output. Returns null if nothing usable, or if the content itself trips the
 *  crisis scanner (fail-closed — a safety plan must never carry injected means/SI). */
export function parseSafetyPlanDraft(raw: unknown): SafetyPlanDraftFields | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const clamp = (v: unknown) => (typeof v === "string" ? v.replace(/\s+\n/g, "\n").trim().slice(0, 500) : "");
  const fields: SafetyPlanDraftFields = {
    warningSigns: clamp(o.warningSigns),
    internalCoping: clamp(o.internalCoping),
    socialDistractors: clamp(o.socialDistractors),
    safeEnvironment: clamp(o.safeEnvironment),
  };
  if (FIELD_KEYS.every((k) => !fields[k])) return null; // nothing extracted
  if (scanForCrisis(FIELD_KEYS.map((k) => fields[k]).join(" "))) return null; // fail-closed
  return fields;
}

/** Draft the four coping fields from conversation. Fail-open/closed: null on absence/error/unsafe. */
export async function draftSafetyPlan(ventText: string): Promise<SafetyPlanDraftFields | null> {
  let raw: string | null;
  try {
    raw = await generateOnDevice(draftSystemPrompt(), [{ role: "user", content: ventText }], () => {}, undefined, {
      jsonSchema: SAFETY_PLAN_DRAFT_SCHEMA as unknown as object,
    });
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return parseSafetyPlanDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export type SafeSafetyPlanResult =
  | { ok: true; draft: SafetyPlanDraftFields }
  | { ok: false; reason: "crisis" | "empty" };

/** §9-gated: an active-crisis message never reaches the model — the caller surfaces crisis help instead. */
export async function safeDraftSafetyPlan(ventText: string): Promise<SafeSafetyPlanResult> {
  const v = ventText.trim();
  if (!v) return { ok: false, reason: "empty" };
  if (scanForCrisis(v)) return { ok: false, reason: "crisis" };
  const draft = await draftSafetyPlan(v);
  if (!draft) return { ok: false, reason: "empty" };
  return { ok: true, draft };
}

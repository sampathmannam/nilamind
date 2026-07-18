import { localDateKey } from "./storageUtils";
import { generateOnDevice } from "./localLlm";
import { applyOutputSafety } from "./nilaSafetyGate";
import { appendToSecureArray } from "./secureLocal";
import { loadSecureArray } from "./secureData";
import { scanForCrisis } from "../safety";
import type { ThoughtRecord } from "../types";

const THOUGHT_RECORDS_KEY = "nilamind_thought_records";

/** All saved thought records. Never throws; returns [] on a missing/unparseable/non-array store. */
export function loadThoughtRecords(): ThoughtRecord[] {
  return loadSecureArray<ThoughtRecord>(THOUGHT_RECORDS_KEY);
}

export interface ThoughtRecordDraft {
  situation: string;
  automaticThought: string;
  emotion: string;
  evidenceFor: string;
  evidenceAgainst: string;
}

const TR_SYSTEM_PROMPT = `You are Nila, helping structure a thought. The person just vented about something. Extract these fields from their words:

SITUATION: What happened? (neutral facts, one sentence)
AUTOMATIC THOUGHT: What went through their mind? (exact words or close paraphrase)
EMOTION: How did it make them feel? (one word + intensity if mentioned)
EVIDENCE FOR: What supports this thought? (2-3 short bullets from their words)
EVIDENCE AGAINST: What goes against it? (2-3 short bullets — be gentle but factual)

Reply ONLY in this format:
SITUATION: <text>
AUTOMATIC THOUGHT: <text>
EMOTION: <text>
EVIDENCE FOR:
- <point>
- <point>
EVIDENCE AGAINST:
- <point>
- <point>

Never add fields they didn't mention. Never diagnose. Keep it in their own words.`;

export async function draftThoughtRecord(ventText: string): Promise<ThoughtRecordDraft | null> {
  const reply = await generateOnDevice(TR_SYSTEM_PROMPT, [
    { role: "user", content: ventText },
  ]);
  if (!reply) return null;
  const safe = applyOutputSafety(reply, ventText, true);
  return parseDraft(safe);
}

export function parseDraft(raw: string): ThoughtRecordDraft {
  const get = (label: string): string => {
    const re = new RegExp(`${label}\\s*:?\\s*(.+?)(?=\\n[A-Z ]{3,}:|$)`, "is");
    return raw.match(re)?.[1]?.trim() ?? "";
  };

  const getList = (label: string): string => {
    const re = new RegExp(`${label}\\s*:?\\s*\\n((?:[-\\u2022]\\s*.+\\n?)+)`, "i");
    return raw.match(re)?.[1]?.trim() ?? "";
  };

  return {
    situation: get("SITUATION"),
    automaticThought: get("AUTOMATIC THOUGHT"),
    emotion: get("EMOTION"),
    evidenceFor: getList("EVIDENCE FOR"),
    evidenceAgainst: getList("EVIDENCE AGAINST"),
  };
}

export interface WizardState {
  situation: string;
  feeling: string;
  initialIntensity: number;
  automaticThought: string;
}

/** Map a ThoughtRecordDraft (from the on-device model) to ThoughtRecordScreen wizard state. */
export function mapDraftToWizard(draft: ThoughtRecordDraft): WizardState {
  const intensityMatch = draft.emotion.match(/(\d{1,3})/);
  const intensity = intensityMatch ? Math.min(100, Math.max(1, parseInt(intensityMatch[1], 10))) : 50;
  return {
    situation: draft.situation,
    feeling: draft.emotion,
    initialIntensity: intensity,
    automaticThought: draft.automaticThought,
  };
}

export function saveThoughtRecord(record: ThoughtRecordDraft): void {
  const entry = {
    ...record,
    id: "tr_" + Date.now(),
    date: localDateKey(),
    timestamp: new Date().toLocaleTimeString(),
  };
  appendToSecureArray("nilamind_thought_records", entry);
}

export type SafeDraftResult =
  | { ok: true; draft: ThoughtRecordDraft }
  | { ok: false; reason: "crisis" | "empty" };

/**
 * §9-gated auto-draft from venting text. A crisis disclosure never reaches the on-device model; we surface
 * crisis help instead. Returns the parsed draft, an empty reason, or a crisis flag.
 */
export async function safeDraftThoughtRecord(ventText: string): Promise<SafeDraftResult> {
  const v = ventText.trim();
  if (!v) return { ok: false, reason: "empty" };
  if (scanForCrisis(v)) return { ok: false, reason: "crisis" };
  const draft = await draftThoughtRecord(v);
  if (!draft) return { ok: false, reason: "empty" };
  return { ok: true, draft };
}

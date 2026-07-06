import { generateOnDevice } from "./localLlm";
import { applyOutputSafety } from "./nilaSafetyGate";
import { appendToSecureArray } from "./secureLocal";

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

export function saveThoughtRecord(record: ThoughtRecordDraft): void {
  const entry = {
    ...record,
    id: "tr_" + Date.now(),
    date: new Date().toISOString().split("T")[0],
    timestamp: new Date().toLocaleTimeString(),
  };
  appendToSecureArray("nilamind_thought_records", entry);
}

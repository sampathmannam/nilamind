import { secureLocal } from "./secureLocal";
import { detectCrisis } from "./crisisClassifier";
import { generateOnDevice, isLocalLlmReady } from "./localLlm";
import { applyOutputSafety } from "./nilaSafetyGate";
import { getSessionChat } from "./sessionChat";

const REFLECTION_KEY = "nilamind_async_reflection";

export interface ReflectionResult {
  text: string;
  insight: string | null;
  at: number;
}

function reflectionSystemPrompt(): string {
  return `You are Nila, doing a private overnight reflection. You just spent the day with this person.
Re-read their conversation and data, then do exactly two things:

1. Write 2-3 warm, gentle sentences reflecting what mattered today — the way a friend who was there would.
Don't report facts like a dashboard; weave them naturally. Start with "Hey — just reflecting on today…".

2. Extract ONE small insight to remember — something about what they're going through, what helped, or what they're working on. Keep it to one sentence. If nothing stood out, return "none".

Format your response as:
REFLECTION: <your 2-3 sentences>
INSIGHT: <one sentence or "none">

Rules: Never diagnose. Never state facts you don't have. Never mention the word "reflection" or "insight" in your text. Keep it warm and natural — like a friend who was there.`;
}

export function parseReflectionOutput(raw: string): { text: string; insight: string | null } {
  const reflectionMatch = raw.match(/REFLECTION:\s*(.+?)(?:\n|$)([\s\S]*?)INSIGHT:/i);
  const text = reflectionMatch?.[1]?.trim() ?? raw.trim();
  const insightMatch = raw.match(/INSIGHT:\s*(.+)/i);
  const insight = insightMatch?.[1]?.trim();
  return {
    text: text || "Hey — just thinking about how today went. I'm glad you were here.",
    insight: insight && insight.toLowerCase() !== "none" ? insight : null,
  };
}

export async function runAsyncReflection(userTurns?: string[]): Promise<ReflectionResult | null> {
  if (!isLocalLlmReady()) return null;

  // Load turns if not provided (for testing)
  const turns = userTurns ?? (() => {
    const chat = getSessionChat();
    return chat.filter((m) => m.role === "user").map((m) => m.content);
  })();

  if (turns.length === 0) return null;

  // §9 pre-scan: never summarize a crisis session
  const allText = turns.join(" ");
  if (await detectCrisis(allText)) return null;

  // Check if we already reflected today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  try {
    const prev = secureLocal.getItem(REFLECTION_KEY);
    if (prev) {
      const parsed = JSON.parse(prev) as ReflectionResult;
      if (parsed.at >= today.getTime()) return parsed;
    }
  } catch { /* first reflection */ }

  const daySummary = turns.slice(-8).map((t) => `They said: "${t}"`).join("\n");
  const reply = await generateOnDevice(reflectionSystemPrompt(), [
    { role: "user", content: daySummary },
  ]);

  if (!reply) return null;
  const safe = applyOutputSafety(reply, allText, true);
  const { text, insight } = parseReflectionOutput(safe);

  const result: ReflectionResult = { text, insight, at: Date.now() };
  secureLocal.setItem(REFLECTION_KEY, JSON.stringify(result));
  return result;
}

export function getLatestReflection(): ReflectionResult | null {
  try {
    const raw = secureLocal.getItem(REFLECTION_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as ReflectionResult;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (r.at >= today.getTime()) return r;
    return null;
  } catch {
    return null;
  }
}

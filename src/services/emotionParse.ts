// emotionParse — pure, on-device parsing of a spoken/typed feeling into our emotion labels and an
// intensity 1–10. Moved verbatim out of NilaVoiceCheckin.tsx so services/agent.ts and the new Nila
// check-in can import without pulling in a React component. No side effects, no network.

const EMOTIONS = ["Anxious", "Low", "Sad", "Angry", "Numb", "Overwhelmed", "Okay", "Calm"];
const WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/** Map a spoken/typed answer to an intensity 1–10. */
export function parseIntensity(s: string): number | null {
  const t = (s || "").toLowerCase();
  const d = t.match(/\b(10|[1-9])\b/);
  if (d) return parseInt(d[1], 10);
  for (const [w, n] of Object.entries(WORD_NUM)) if (t.includes(w)) return n;
  return null;
}

/** Map a spoken/typed feeling to one of our emotion labels (best-effort), else Title-case the raw word. */
export function mapEmotion(s: string): string {
  const t = (s || "").toLowerCase();
  const hit = EMOTIONS.find((e) => t.includes(e.toLowerCase()));
  if (hit) return hit;
  const extra: Record<string, string> = { panic: "Anxious", scared: "Anxious", worried: "Anxious", down: "Low", depressed: "Low", empty: "Numb", numb: "Numb", angry: "Angry", mad: "Angry", fine: "Okay", good: "Okay", calm: "Calm", tired: "Low" };
  for (const [k, v] of Object.entries(extra)) if (t.includes(k)) return v;
  const first = (s || "").trim().split(/\s+/)[0] || "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
}

/** Strip a writer's provenance suffix, e.g. "Anxious (Nila)" → "Anxious". Shared by orchestration,
 *  the merged Dashboard emotion chart, and the once-a-day check-in trigger. */
export function stripProvenance(emotion: string): string {
  return emotion.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

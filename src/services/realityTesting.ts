/**
 * Reality-testing for memory retrieval.
 *
 * When Nila surfaces past content (memories, diary entries, check-ins), this module
 * validates the memory against its evidence rating to prevent reinforcing negative
 * cognitive distortions. High-distress, low-evidence memories are flagged with a
 * gentle coaching response.
 *
 * Research basis: Reality testing is a core CBT technique (Beck, 1976) that
 * challenges the evidence for distressing thoughts. In bipolar disorder, negative
 * memory bias is amplified during depressive episodes (Lloyd et al., 2005).
 * Memory retrieval without evidence context can reinforce hopelessness.
 */

export interface MemoryEntry {
  text: string;
  distress: number; // 1-10
  evidence: number; // 1-10 (how much evidence supports this memory as accurate/fair)
  date: string;
}

export interface ValidationResult {
  flagged: boolean;
  reason: string;
  coachingText: string;
}

export interface BiasResult {
  hasBias: boolean;
  negativeRatio: number;
  totalMemories: number;
}

const DISTRESS_THRESHOLD = 6;
const EVIDENCE_THRESHOLD = 4;

const COACHING_RESPONSES = [
  "This memory carries a lot of weight right now. The distress is real, but the evidence for it might be worth examining — thoughts during hard moments can feel more certain than they are.",
  "I hear how painful this is. Sometimes our minds highlight the worst moments and blur the rest. What evidence supports this? What evidence might contradict it?",
  "This feels very real. When distress is high, our brains can make things feel more absolute than they are. It might help to ask: would a close friend see this the same way?",
  "Thank you for sharing this. High distress can make memories feel like facts. It might help to gently check: is this the full picture, or is pain narrowing the view?",
];

/**
 * Validate a memory retrieval against evidence ratings.
 * Flags high-distress, low-evidence memories with coaching text.
 */
export function validateMemoryRetrieval(memory: MemoryEntry): ValidationResult {
  const { distress, evidence } = memory;

  if (distress >= DISTRESS_THRESHOLD && evidence <= EVIDENCE_THRESHOLD) {
    const idx = Math.abs(hashString(memory.text)) % COACHING_RESPONSES.length;
    return {
      flagged: true,
      reason: `High distress (${distress}/10) with low evidence (${evidence}/10) — this memory may be amplified by current mood state.`,
      coachingText: COACHING_RESPONSES[idx],
    };
  }

  return { flagged: false, reason: "", coachingText: "" };
}

/**
 * Detect negative bias across a set of memories.
 * Returns bias analysis when negative memories disproportionately dominate.
 */
export function detectNegativeBias(memories: MemoryEntry[]): BiasResult {
  if (memories.length === 0) {
    return { hasBias: false, negativeRatio: 0, totalMemories: 0 };
  }

  const negativeCount = memories.filter((m) => m.distress >= DISTRESS_THRESHOLD).length;
  const negativeRatio = negativeCount / memories.length;

  return {
    hasBias: negativeRatio > 0.6,
    negativeRatio: Math.round(negativeRatio * 100) / 100,
    totalMemories: memories.length,
  };
}

/** Simple deterministic hash for consistent coaching selection. */
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Estimate distress level from memory text using keyword signals.
 * Returns 1-10 scale.
 */
export function estimateDistress(text: string): number {
  const lower = text.toLowerCase();
  let score = 3; // baseline
  if (/\b(hopeless|worthless|suicid|want to die|end it)\b/i.test(lower)) score = 9;
  else if (/\b(terrible|awful|worst|can't cope|falling apart|breaking down)\b/i.test(lower)) score = 8;
  else if (/\b(very (?:sad|stressed|anxious|overwhelmed)|really (?:bad|hard|difficult))\b/i.test(lower)) score = 7;
  else if (/\b(sad|stressed|anxious|overwhelmed|struggling|hard|difficult|painful)\b/i.test(lower)) score = 6;
  else if (/\b(tired|worried|concerned|uneasy|off|low)\b/i.test(lower)) score = 5;
  else if (/\b(okay|fine|alright|decent)\b/i.test(lower)) score = 4;
  else if (/\b(good|great|happy|better|well|nice|calm|peaceful)\b/i.test(lower)) score = 2;
  return score;
}

/**
 * Analyze a set of memory notes for negative bias.
 * Used as a nilaContext block when memories are surfaced.
 */
export function memoryBiasBlock(memories: { note: string; date: string }[]): string {
  if (memories.length < 2) return "";
  const entries: MemoryEntry[] = memories.map((m) => ({
    text: m.note,
    distress: estimateDistress(m.note),
    evidence: 5, // unknown — treat as neutral
    date: m.date,
  }));
  const bias = detectNegativeBias(entries);
  if (!bias.hasBias) return "";
  return `[Reality-testing signal: ${Math.round(bias.negativeRatio * 100)}% of recent memories skew negative. When surfacing past content, gently check evidence alongside the feeling — don't just echo the negative frame.]`;
}

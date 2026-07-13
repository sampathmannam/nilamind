// Distribution metrics over a SET of generated replies — the early-warning system for mode-collapse
// (the failure that killed the last QLoRA). Deterministic; operates on output text only.

export interface AntiCollapseReport {
  /** count of replies by sentence-count bucket: "1" | "2" | "3" | "4+" */
  lengthHist: Record<string, number>;
  /** fraction of replies ending in a question mark (target ~50/50, not 90% questions) */
  questionEndRatio: number;
  /** mean pairwise trigram overlap across replies, 0 (all distinct) .. 1 (identical) */
  repetitionRate: number;
}

function sentenceCount(text: string): number {
  const matches = text.trim().match(/[.!?]+(\s|$)/g);
  return matches ? matches.length : text.trim() ? 1 : 0;
}

function trigrams(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const grams = new Set<string>();
  for (let i = 0; i + 2 < words.length + 1 && i + 2 <= words.length; i++) {
    if (i + 3 <= words.length) grams.add(words.slice(i, i + 3).join(" "));
  }
  // fall back to the single "sentence" for very short replies so identical shorts still register as dup
  if (grams.size === 0 && words.length) grams.add(words.join(" "));
  return grams;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function antiCollapseReport(replies: string[]): AntiCollapseReport {
  const lengthHist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4+": 0 };
  if (replies.length === 0) {
    return { lengthHist, questionEndRatio: 0, repetitionRate: 0 };
  }

  let questionEnders = 0;
  for (const r of replies) {
    const s = sentenceCount(r);
    const bucket = s >= 4 ? "4+" : String(Math.max(1, s));
    lengthHist[bucket] = (lengthHist[bucket] ?? 0) + 1;
    if (/[?？]\s*$/.test(r.trim())) questionEnders++;
  }

  const grams = replies.map(trigrams);
  let pairSum = 0;
  let pairs = 0;
  for (let i = 0; i < grams.length; i++) {
    for (let j = i + 1; j < grams.length; j++) {
      pairSum += jaccard(grams[i], grams[j]);
      pairs++;
    }
  }

  return {
    lengthHist,
    questionEndRatio: questionEnders / replies.length,
    repetitionRate: pairs === 0 ? 0 : pairSum / pairs,
  };
}

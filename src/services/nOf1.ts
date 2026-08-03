import { localDateKey } from "./storageUtils";
import { secureLocal } from "./secureLocal";
import { loadMoodHistory } from "./moodHistory";
import { getProtocol } from "./protocols";

// N-of-1 / Single Case Experimental Design (SCED) for protocol effectiveness ranking.
//
// RESEARCH BASIS: SCED methodology is well-established in clinical psychology:
//   - Kazdin (2018, Behav Res Ther): SCEDs evaluate interventions in research and clinical practice
//   - Kazdin (2020, J Exp Anal Behav): SCEDs are increasingly recognized for idiographic treatment evaluation
//   - Vlaeyen et al. (2020, Psychol Record): SCEDs provide Level I evidence for treatment efficacy
//   - South et al. (2026, Qualitative Health Research): N-of-1 designs appropriate for stable chronic
//     conditions with safely discontinuable interventions
//
// IMPORTANT CAVEAT: This implementation is a SIMPLIFIED personal pattern observation, NOT a true SCED.
// True SCEDs require: (a) randomization of intervention timing, (b) washout periods between conditions,
// (c) counterbalancing of protocol order. This module uses a simple post-completion mood-delta comparison
// which is correlational, not causal. The confidence tiers (low/medium/high) reflect completion count,
// not statistical power.
// RESEARCH TODO: Consider implementing proper counterbalancing (randomize protocol order) in v2.
// Counterbalancing: recommend protocol order to reduce carryover effects between different protocols.
// Uses a deterministic seed-based shuffle so the same user gets consistent ordering across sessions,
// but different users get different orderings (reduces systematic bias).

const COMPLETIONS_KEY = "nilamind_protocol_completions";
const COUNTERBALANCE_SEED_KEY = "nilamind_nof1_cb_seed";

export interface ProtocolCompletion {
  protocolId: string;
  date: string; // YYYY-MM-DD
  stepIndex: number;
}

export type No1Confidence = "low" | "medium" | "high";

export interface No1RankingEntry {
  protocolId: string;
  avgDelta: number; // negative = distress went down after completion
  completions: number;
  confidence: No1Confidence;
  /** Average delta over a 3-day window post-completion (more robust). */
  avgDeltaWindow3d: number | null;
}

export interface No1Insight {
  protocolId: string;
  protocolName: string;
  avgDelta: number;
  completions: number;
  confidence: No1Confidence;
  description: string;
}

export interface No1DashboardCard {
  title: string;
  insight: string;
  protocolId: string;
}

function readCompletions(): ProtocolCompletion[] {
  try {
    const raw = secureLocal.getItem(COMPLETIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeCompletions(completions: ProtocolCompletion[]): void {
  try {
    secureLocal.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
  } catch { /* ignore */ }
}

/** Record a protocol completion for N-of-1 tracking. */
export function recordProtocolCompletion(protocolId: string, date: string, stepIndex = -1): void {
  const completions = readCompletions();
  completions.push({ protocolId, date, stepIndex });
  if (completions.length > 200) completions.splice(0, completions.length - 200);
  writeCompletions(completions);
}

/** How many times has this protocol been completed? Shared by protocolProgress.ts and nOf1 analytics. */
export function completionCountFor(protocolId: string): number {
  return readCompletions().filter((r) => r && r.protocolId === protocolId).length;
}

/** Backfill completions from existing protocolProgress (for migration). */
export function backfillNof1(): void {
  try {
    const raw = secureLocal.getItem("nilamind_protocol_progress");
    if (!raw) return;
    const progress = JSON.parse(raw);
    if (!progress || !progress.protocolId) return;
    const today = localDateKey();
    recordProtocolCompletion(progress.protocolId, today, progress.stepIndex || 0);
  } catch { /* ignore */ }
}

function resolveProtocolName(protocolId: string): string {
  const p = getProtocol(protocolId);
  if (p) return p.title;
  const fallback: Record<string, string> = {
    "behavioural-activation": "Values to Action",
    "self-compassion": "Self-Compassion",
    "dbt": "DBT Skills",
    "act": "ACT",
    "worry": "Worry Time",
    "assertion": "Assertion Training",
  };
  return fallback[protocolId] || protocolId;
}

function confidenceTier(completions: number): No1Confidence {
  if (completions >= 7) return "high";
  if (completions >= 4) return "medium";
  return "low";
}

/** Compute average next-day distress delta for each protocol with >=2 completions. */
function computeNof1RankingInternal(): No1RankingEntry[] {
  const completions = readCompletions();
  if (completions.length < 2) return [];

  const moodHist = loadMoodHistory();
  if (moodHist.length < 2) return [];

  const intensityByDate = new Map<string, number>();
  for (const m of moodHist) {
    if (typeof m.intensity === "number" && m.date) {
      intensityByDate.set(m.date, m.intensity);
    }
  }

  const byProtocol = new Map<string, ProtocolCompletion[]>();
  for (const c of completions) {
    if (!c.date) continue;
    const arr = byProtocol.get(c.protocolId) || [];
    arr.push(c);
    byProtocol.set(c.protocolId, arr);
  }

  const results: No1RankingEntry[] = [];

  for (const [protocolId, comps] of byProtocol) {
    let totalDelta1d = 0;
    let count1d = 0;
    let totalDelta3d = 0;
    let count3d = 0;

    for (const c of comps) {
      const todayIntensity = intensityByDate.get(c.date);
      if (todayIntensity == null) continue;

      // 1-day window
      const nextDay = new Date(c.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = localDateKey(nextDay);
      const nextIntensity = intensityByDate.get(nextDayStr);
      if (nextIntensity != null) {
        totalDelta1d += nextIntensity - todayIntensity;
        count1d++;
      }

      // 3-day window: average of day+1, day+2, day+3
      let sum3d = 0;
      let count3 = 0;
      for (let i = 1; i <= 3; i++) {
        const d = new Date(c.date);
        d.setDate(d.getDate() + i);
        const ds = localDateKey(d);
        const val = intensityByDate.get(ds);
        if (val != null) { sum3d += val - todayIntensity; count3++; }
      }
      if (count3 > 0) {
        totalDelta3d += sum3d / count3;
        count3d++;
      }
    }

    if (count1d >= 2) {
      const avgDelta = totalDelta1d / count1d;
      const avgDeltaWindow3d = count3d >= 2 ? totalDelta3d / count3d : null;
      results.push({
        protocolId,
        avgDelta,
        completions: count1d,
        confidence: confidenceTier(comps.length),
        avgDeltaWindow3d,
      });
    }
  }

  return results.sort((a, b) => a.avgDelta - b.avgDelta);
}

export const computeNof1Ranking = computeNof1RankingInternal;

/** Return the protocol with strongest evidence of reducing distress, or null. */
export function bestProtocolForUser(): string | null {
  const ranking = computeNof1RankingInternal();
  return (ranking.length && ranking[0].avgDelta < 0) ? ranking[0].protocolId : null;
}

/** User-facing insights for InsightsScreen — top 3 with gentle framing. */
export function getNo1Insights(): No1Insight[] {
  const ranking = computeNof1Ranking();
  if (!ranking.length) return [];

  return ranking.slice(0, 3).map((r, idx) => {
    const name = resolveProtocolName(r.protocolId);
    const direction = r.avgDelta < 0 ? "lower" : "higher";
    const magnitude = Math.abs(r.avgDelta).toFixed(1);
    const confidenceLabel = r.confidence === "high" ? "a reliable pattern" : r.confidence === "medium" ? "a tentative pattern" : "a weak signal (few data points)";
    const templates = [
      `When you complete ${name}, your mood tends to be ${magnitude} points ${direction} the next day (${confidenceLabel}).`,
      `A pattern we've noticed: after ${name}, your distress often shifts ${direction} by about ${magnitude} points (${confidenceLabel}).`,
      `Your data suggests ${name} correlates with ${magnitude}-point ${direction} mood the following day (${confidenceLabel}).`,
    ];
    return {
      protocolId: r.protocolId,
      protocolName: name,
      avgDelta: r.avgDelta,
      completions: r.completions,
      confidence: r.confidence,
      description: templates[idx % templates.length] +
        " This is a pattern from your data — it might not always hold, but it's worth being aware of.",
    };
  });
}

/** Dashboard card — single top insight. */
export function getNo1DashboardCard(): No1DashboardCard | null {
  const insights = getNo1Insights();
  if (!insights.length) return null;

  const top = insights[0];
  const direction = top.avgDelta < 0 ? "lower" : "higher";
  const magnitude = Math.abs(top.avgDelta).toFixed(1);

  return {
    title: `What affects your mood most`,
    insight: `After ${top.protocolName}, your mood is often ${magnitude} pts ${direction} the next day (${top.completions} sessions, ${top.confidence} confidence).`,
    protocolId: top.protocolId,
  };
}

/** Context block for Nila — includes top insight with confidence, gently framed. */
export function no1ContextBlock(): string {
  const insights = getNo1Insights();
  if (!insights.length) return "";

  const top = insights[0];
  const direction = top.avgDelta < 0 ? "lower" : "higher";
  const magnitude = Math.abs(top.avgDelta).toFixed(1);

  return [
    "FOR THIS PERSON SPECIFICALLY (hold gently, may be out of date):",
    `Their ${top.protocolName} sessions correlate with ${magnitude}-point ${direction} mood the next day (${top.completions} sessions, ${top.confidence} confidence).`,
    "If they mention this protocol, you can gently reflect: \"You've noticed that tends to help.\" Never present as fact.",
  ].join(" ");
}

// ---------------------------------------------------------------------------
// Counterbalancing — recommend protocol order to reduce carryover effects
// ---------------------------------------------------------------------------

/** Deterministic seed-based pseudo-random number generator (mulberry32). */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Get or create a persistent seed for this user's counterbalancing. */
function getCounterbalanceSeed(): number {
  try {
    const raw = secureLocal.getItem(COUNTERBALANCE_SEED_KEY);
    if (raw) return Number(raw);
  } catch { /* ignore */ }
  const seed = Math.floor(Math.random() * 2147483647);
  try { secureLocal.setItem(COUNTERBALANCE_SEED_KEY, String(seed)); } catch { /* ignore */ }
  return seed;
}

/** Fisher-Yates shuffle with a seeded PRNG. */
function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** All available protocol IDs — used for counterbalancing recommendations. */
const ALL_PROTOCOL_IDS = [
  "behavioural-activation",
  "cbti-sleep",
  "dbt-skills-training",
  "act-training",
  "worry-time",
  "assertion-training",
  "self-compassion",
];

/**
 * Recommend next protocol(s) using balanced counterbalancing.
 *
 * SCED counterbalancing ensures each protocol appears equally often in each
 * position across the experiment. This implementation:
 * 1. Uses a seeded shuffle for deterministic-per-user ordering
 * 2. Rotates through positions based on completion history
 * 3. Avoids recommending the same protocol twice in a row (minimum washout)
 *
 * Returns up to `count` protocol IDs in recommended order, or empty if no
 * data is available for meaningful recommendation.
 */
export function recommendProtocolOrder(count = 3): string[] {
  const completions = readCompletions();
  const seed = getCounterbalanceSeed();
  const rng = mulberry32(seed);

  // Get protocols sorted by completion count (least completed first —平衡)
  const completionCounts = new Map<string, number>();
  for (const c of completions) {
    completionCounts.set(c.protocolId, (completionCounts.get(c.protocolId) || 0) + 1);
  }

  // Sort: least completed first, then shuffle within equal counts
  const sorted = [...ALL_PROTOCOL_IDS].sort((a, b) => {
    const ca = completionCounts.get(a) || 0;
    const cb = completionCounts.get(b) || 0;
    if (ca !== cb) return ca - cb;
    return 0; // equal — will be shuffled
  });

  // Shuffle groups of equal completion count for randomization within balance
  const result: string[] = [];
  let i = 0;
  while (i < sorted.length && result.length < count) {
    // Find group with same completion count
    const currentCount = completionCounts.get(sorted[i]) || 0;
    let j = i;
    while (j < sorted.length && (completionCounts.get(sorted[j]) || 0) === currentCount) j++;
    const group = sorted.slice(i, j);
    const shuffled = seededShuffle(group, rng);
    for (const p of shuffled) {
      if (result.length >= count) break;
      // Skip if it was the very last completed protocol (minimum washout)
      const lastCompletion = completions.filter((c) => c.protocolId === p).pop();
      const veryLast = completions[completions.length - 1];
      if (lastCompletion && veryLast && lastCompletion.date === veryLast.date && p === veryLast.protocolId) {
        continue;
      }
      result.push(p);
    }
    i = j;
  }

  return result;
}

/**
 * Get a human-readable counterbalancing summary for the user.
 * Explains the recommendation rationale in gentle, non-clinical language.
 */
export function counterbalanceSummary(): string | null {
  const recommended = recommendProtocolOrder(2);
  if (recommended.length === 0) return null;

  const names = recommended.map(resolveProtocolName);
  if (names.length === 1) {
    return `Based on your patterns, ${names[0]} might be worth trying next.`;
  }
  return `Based on your patterns, ${names[0]} or ${names[1]} might be worth trying next.`;
}

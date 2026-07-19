import { secureLocal } from "./secureLocal";
import { localDateKey } from "./storageUtils";

// Day-bucketed rolling affect history — Phase 2 of
// docs/superpowers/specs/2026-07-19-orb-affect-accent-phase2-design.md. One running-average bucket per
// LOCAL calendar day (localDateKey — never toISOString, which mis-stamps local evening entries; see
// storageUtils.ts's own doc comment), capped at the last 30 days on every write.
//
// Both READ paths (todayAffectBucket, recentAffectDays) are gated behind
// setAffectAccentPersistenceEnabled, OFF by default — a second, independent gate on top of Phase 1's
// setAffectAccentEnabled (which gates whether noteChatAffect is ever called at all, in ModeScreen.tsx).
// The WRITE path (noteChatAffect) is unaffected by this flag; it always persists whatever it's given.
const KEY = "nilamind_chat_affect";
const RETENTION_DAYS = 30;

export interface AffectBucket {
  valence: number;
  arousal: number;
  count: number;
}

type AffectHistory = Record<string, AffectBucket>;

let _persistenceEnabled = false;

/** Master switch for Phase 2's READ paths — OFF until device-verified. Never affects noteChatAffect. */
export function setAffectAccentPersistenceEnabled(on: boolean): void {
  _persistenceEnabled = on;
}

function loadHistory(): AffectHistory {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function pruneOld(history: AffectHistory, now: number): AffectHistory {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffKey = localDateKey(cutoff);
  const pruned: AffectHistory = {};
  for (const [date, bucket] of Object.entries(history)) {
    if (date >= cutoffKey) pruned[date] = bucket;
  }
  return pruned;
}

/** Fold the raw blended per-turn reading into TODAY's running-average bucket. Best-effort — a missed
 *  write only means a future read sees a stale/absent bucket for today; it never affects the accent's
 *  own render decision (that's computed and rendered from the same-turn value directly in
 *  ModeScreen.tsx/NilaFace.tsx, never from this store). MUST be called with the raw blended head
 *  output, never the render-side anxious-damped magnitude (that damping lives entirely inside
 *  NilaFace.tsx/nilaFaceAccent.ts and is never passed here). */
export function noteChatAffect(reading: { valence: number; arousal: number }, now: number = Date.now()): void {
  try {
    const history = loadHistory();
    const today = localDateKey(new Date(now));
    const existing = history[today];
    const count = (existing?.count ?? 0) + 1;
    const valence = existing ? (existing.valence * existing.count + reading.valence) / count : reading.valence;
    const arousal = existing ? (existing.arousal * existing.count + reading.arousal) / count : reading.arousal;
    history[today] = { valence, arousal, count };
    secureLocal.setItem(KEY, JSON.stringify(pruneOld(history, now)));
  } catch {
    /* best-effort */
  }
}

/** Today's running-average bucket, or null if absent or persistence reads are disabled. Consumed by
 *  modeEngine.ts's foldAffectAccent. */
export function todayAffectBucket(now: number = Date.now()): AffectBucket | null {
  if (!_persistenceEnabled) return null;
  const history = loadHistory();
  return history[localDateKey(new Date(now))] ?? null;
}

/** Buckets from the last `days` local days that have data (sparse — days with no chat produce no
 *  entry), most recent first. [] if absent or persistence reads are disabled. Consumed by
 *  nilaContext.ts's buildReflectionDigest. */
export function recentAffectDays(days: number, now: number = Date.now()): Array<{ date: string } & AffectBucket> {
  if (!_persistenceEnabled) return [];
  const history = loadHistory();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = localDateKey(cutoff);
  return Object.entries(history)
    .filter(([date]) => date > cutoffKey)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, bucket]) => ({ date, ...bucket }));
}

export interface ConversationToneSummary {
  text: string;
  daysUsed: number;
  windowDays: number;
}

// Below this many distinct days, only LEVEL language is honest ("was mostly difficult") — a
// trajectory claim ("trended difficult") implies more points than 3-4 scattered days can support,
// and "trend" is precisely the word a clinician will weight most heavily.
const TRAJECTORY_MIN_DAYS = 5;
// A minimum total-reading floor alongside the day-count floor: three days of count:1 (one turn each)
// would otherwise clear a day-count-only floor on three total model readings from a head that's wrong
// roughly 1 time in 3-4.
const MIN_TOTAL_READINGS = 10;
// Minimum gap between the older and newer half's mean valence before "trended X" is justified — day
// count alone is a NECESSARY condition for trajectory language, never a SUFFICIENT one: a flat run of
// uniformly negative days at 5+ distinct days is a level, not a trend, and must render as "was mostly
// difficult", not "trended difficult".
const DIRECTION_THRESHOLD = 0.15;

/** A closed-vocabulary, per-report clinician-facing summary of recent conversation tone — see
 *  docs/superpowers/specs/2026-07-19-orb-affect-accent-clinician-report-design.md. Pure and
 *  side-effect-free; callers are responsible for freezing the result at consent-time (see
 *  clinicianToneOptIn.ts) rather than recomputing it later. */
export function computeConversationToneSummary(
  periodDays: number,
  now: number = Date.now()
): ConversationToneSummary | null {
  const windowDays = Math.min(periodDays, 30); // chatAffect.ts's own 30-day retention cap
  const days = recentAffectDays(windowDays, now); // most-recent-first, per recentAffectDays's own contract
  const floorDays = Math.max(3, Math.ceil(windowDays * 0.3));
  const totalReadings = days.reduce((s, d) => s + d.count, 0);
  if (days.length < floorDays || totalReadings < MIN_TOTAL_READINGS) return null;

  // Deliberately unweighted by `count` — a 1-turn day and a 20-turn day count equally toward the
  // level. Day-level equal weighting (not reading-level) is the intended aggregation; do not "fix"
  // this into a count-weighted average.
  const avgValence = days.reduce((s, d) => s + d.valence, 0) / days.length;
  const level = avgValence <= -0.2 ? "difficult" : avgValence >= 0.2 ? "positive" : "mixed";

  // Real direction check: split chronologically (oldest half vs newest half) and compare means.
  // recentAffectDays returns most-recent-first, so reverse before halving.
  const chronological = [...days].reverse();
  const mid = Math.floor(chronological.length / 2);
  const olderHalf = chronological.slice(0, mid);
  const newerHalf = chronological.slice(mid);
  const olderAvg = olderHalf.reduce((s, d) => s + d.valence, 0) / olderHalf.length;
  const newerAvg = newerHalf.reduce((s, d) => s + d.valence, 0) / newerHalf.length;
  const hasDirection = days.length >= TRAJECTORY_MIN_DAYS && Math.abs(newerAvg - olderAvg) >= DIRECTION_THRESHOLD;

  // "mixed" never takes trajectory language — a near-zero average produced by real volatility (e.g.
  // swinging from very positive to very negative) would misreport as "stayed mixed" if trajectory
  // wording applied here; "was mixed" is the only phrase this level ever emits.
  const verb =
    level === "mixed"
      ? "was mixed"
      : (hasDirection ? `trended ${level}` : `was mostly ${level}`);

  const capNote = periodDays > 30
    ? " (Conversation-tone history is kept for 30 days, so this covers the most recent 30 only.)"
    : "";

  const text =
    `Model estimate — ${days.length} days of conversation across the last ${windowDays} days: ${verb}. ` +
    `This is an automatic tone estimate from the app's on-device model, not something the patient ` +
    `explicitly told the app, and it is not a clinically validated measure. If this conflicts with ` +
    `other self-reported data in this summary, trust the self-reported data.${capNote}`;

  return { text, daysUsed: days.length, windowDays };
}

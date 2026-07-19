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

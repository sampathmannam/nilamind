// N-of-1 protocol testing — what works for THIS person.
// Privacy-first, on-device: we correlate the user's own protocol completions with their own subsequent
// mood (from check-ins) to rank which protocols have, for them, been followed by steadier/less-distressed
// days. This is a personalised, within-person signal — explicitly NOT a clinical claim. Compute only;
// no model call.

import { secureLocal, appendToSecureArray } from "./secureLocal";
import { loadMoodHistory } from "./moodHistory";

const KEY = "nilamind_protocol_completions";

export interface ProtocolCompletion {
  id: string;
  protocolId: string;
  date: string; // YYYY-MM-DD of completion
  distressSameDay: number | null;
  distressNextDay: number | null;
}

/** Record a protocol completion. Pulls same-day and next-day distress from check-ins if available. */
export function recordProtocolCompletion(protocolId: string, date = new Date().toISOString().split("T")[0]): ProtocolCompletion {
  const mood = loadMoodHistory();
  const byDate = new Map(mood.map((m) => [m.date, m]));
  const same = byDate.get(date);
  const next = byDate.get(nextDay(date));
  const rec: ProtocolCompletion = {
    id: "pc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    protocolId,
    date,
    distressSameDay: same?.intensity ?? null,
    distressNextDay: next?.intensity ?? null,
  };
  appendToSecureArray(KEY, rec);
  return rec;
}

function nextDay(ymd: string): string {
  const d = new Date(ymd + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return localYmd(d);
}

function ymdOffset(ymd: string, off: number): string {
  const d = new Date(ymd + "T00:00:00");
  d.setDate(d.getDate() + off);
  return localYmd(d);
}

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Backfill distress values that couldn't exist at completion time. distressNextDay is looked up when the
 *  protocol is completed — but "tomorrow's" check-in doesn't exist yet, so it was ALWAYS null and the whole
 *  ranking stayed empty. This fills it (and any missing same-day value) from check-ins once those days have
 *  been logged. Idempotent; persists only when something changed. Runs before every ranking. */
export function backfillNof1(): ProtocolCompletion[] {
  let list: ProtocolCompletion[];
  try { const r = secureLocal.getItem(KEY); list = r ? JSON.parse(r) : []; } catch { return []; }
  if (!Array.isArray(list) || list.length === 0) return list ?? [];
  const byDate = new Map(loadMoodHistory().map((m) => [m.date, m]));
  let changed = false;
  for (const c of list) {
    if (c.distressSameDay == null) {
      const same = byDate.get(c.date);
      if (same?.intensity != null) { c.distressSameDay = same.intensity; changed = true; }
    }
    if (c.distressNextDay == null) {
      const next = byDate.get(nextDay(c.date));
      if (next?.intensity != null) { c.distressNextDay = next.intensity; changed = true; }
    }
  }
  if (changed) secureLocal.setItem(KEY, JSON.stringify(list));
  return list;
}

/** Compute per-protocol effect: average change in distress from completion day to the following day.
 *  Negative delta = distress dropped (good). Returns ranked best-first. */
export function computeNof1Ranking(): { protocolId: string; completions: number; avgDelta: number; avgNextDay: number }[] {
  const raw = backfillNof1();
  const byProto = new Map<string, ProtocolCompletion[]>();
  for (const c of raw) {
    if (c.distressSameDay == null || c.distressNextDay == null) continue;
    const arr = byProto.get(c.protocolId) ?? [];
    arr.push(c);
    byProto.set(c.protocolId, arr);
  }
  const out: { protocolId: string; completions: number; avgDelta: number; avgNextDay: number }[] = [];
  for (const [protocolId, list] of byProto) {
    if (list.length < 2) continue; // need a little evidence
    const deltas = list.map((c) => (c.distressNextDay as number) - (c.distressSameDay as number));
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const avgNext = list.reduce((a, c) => a + (c.distressNextDay as number), 0) / list.length;
    out.push({ protocolId, completions: list.length, avgDelta: Math.round(avgDelta * 10) / 10, avgNextDay: Math.round(avgNext * 10) / 10 });
  }
  // Best first: most negative avgDelta (distress improved) wins.
  out.sort((a, b) => a.avgDelta - b.avgDelta);
  return out;
}

/** The protocol that has, for this user, most often been followed by lower distress. Null if no evidence. */
export function bestProtocolForUser(): string | null {
  const r = computeNof1Ranking();
  return r.length && r[0].avgDelta < 0 ? r[0].protocolId : null;
}

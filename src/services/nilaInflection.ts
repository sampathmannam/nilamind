// Phase 2 inflection-awareness — PURE, ON-DEVICE detector (no network). Emits typed signals from the
// person's own check-in + screening history. mood_trend runs on a VALENCE-DERIVED distress value
// (negative-emotion strength), NOT raw `intensity` (which is emotion strength — "Calm, Intense" ≠ distress).
import { assessmentsFor, type AssessmentEntry, type InstrumentId, loadAssessments, latestFor, daysSince } from "./assessments";
import { ASSESSMENT_MCID } from "./patternInsights";
import { stripProvenance } from "./emotionParse";
import type { CheckInEntry } from "../types";
import { secureLocal } from "./secureLocal";
import { ymd } from "./streaks";

export type InflectionKind = "screening_change" | "mood_trend";
export type InflectionDirection = "deterioration" | "improvement";
export interface InflectionSignal {
  id: string;                 // STABLE per kind|metric|direction|periodKey
  kind: InflectionKind;
  direction: InflectionDirection;
  metric: "PHQ-9" | "GAD-7" | "mood";
  detail: string;
  opener: string;
  basis: string;
  date: string;               // YYYY-MM-DD local (passed in)
  dataPoints: number;
}

export function mean(xs: number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
export function sampleStdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) * (x - m), 0) / (xs.length - 1));
}

// The 7 canonical mood chips (nilaCheckinReducer). Exact-match these FIRST so the dominant chip flow
// is always correct; fall back to a prefix regex only for free-text emotions (documented residual gap
// — e.g. a free-text "fearless" would match "fear"; chips never hit that path).
const POSITIVE_CHIPS = new Set(["calm", "okay"]);
const NEGATIVE_CHIPS = new Set(["low", "anxious", "angry", "numb", "overwhelmed"]);
// The negative-valence stems include a MIXED / dysphoric-activation cluster (racing, restless, agitat,
// wired, manic, on-edge…) so a high-energy AGITATED state registers as distress instead of 0. Without it a
// mixed episode (manic energy + distress) reads as "no distress" and can trip the "improvement" opener —
// i.e. Nila cheerleads a mixed-state user at peak risk. (Red-panel clinical finding; §9 itself, which
// scans crisis language, is already pole-agnostic — this gap was only in the trajectory/distress model.)
const NEGATIVE = /(low|sad|down|empty|hopeless|anx|worr|overwhelm|panic|nervous|afraid|fear|dread|angr|irritab|numb|asham|shame|guilt|lonely|stress|racing|restless|agitat|jitter|wired|frantic|spiral|manic|keyed up|on.edge|out of control)/i;
/** Distress = strength for a negative-valence OR mixed/agitated emotion; calm/okay/neutral/unknown → 0.
 *  (Stored `intensity` is emotion STRENGTH, not distress — "Calm, Intense" must read as 0 distress.) */
export function emotionDistress(emotion: string, intensity: number): number {
  const e = stripProvenance(emotion || "").trim().toLowerCase();
  const val = Number.isFinite(intensity) ? intensity : 0;
  if (POSITIVE_CHIPS.has(e)) return 0;     // exact chip → always correct
  if (NEGATIVE_CHIPS.has(e)) return val;
  return NEGATIVE.test(e) ? val : 0;       // free-text fallback
}

function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00") - Date.parse(a + "T00:00:00")) / 86400000);
}
function prettyDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function isoWeek(date: string): string {
  const d = new Date(date + "T00:00:00");
  const day = (d.getDay() + 6) % 7;        // Mon=0
  d.setDate(d.getDate() - day + 3);        // Thursday of this week
  const firstThu = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round((d.getTime() - firstThu.getTime()) / 86400000 / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

const OPENERS: Record<string, string> = {
  "mood_trend|deterioration": "Before anything else — I've had a sense the last couple of weeks have felt a bit heavier than they usually are for you. Does that fit? You know yourself best.",
  "mood_trend|improvement": "One thing I wanted to name: the last little while has looked a touch lighter than your usual. Does that feel right?",
  "screening_change|deterioration": "Last time you did your {metric} it had moved up a fair bit from the time before. No conclusions — just checking in: has it felt harder lately?",
  "screening_change|improvement": "Your last {metric} had come down a good bit from the time before — worth noticing. Does it feel like things have eased a little?",
};
function openerFor(kind: InflectionKind, direction: InflectionDirection, metric: string): string {
  return (OPENERS[`${kind}|${direction}`] || "").replace("{metric}", metric);
}

// ── detection constants ──
const RECENT_DAYS = 10, BASELINE_DAYS = 60, MIN_RECENT = 5, MIN_BASELINE = 10;
const MARGIN_FLOOR = 1.0, MARGIN_SD_K = 0.75, PERSIST_RATIO = 0.6, MIN_PERSIST = 5;
const SCREEN_MIN_INTERVAL_DAYS = 7;

/** PURE. Emit 0+ inflection signals from the person's own history. `today` = local YYYY-MM-DD. */
export function detectInflections(checkins: CheckInEntry[], assessments: AssessmentEntry[], today: string): InflectionSignal[] {
  const out: InflectionSignal[] = [];

  // screening_change — reliable change across ≥7 days
  for (const id of ["PHQ-9", "GAD-7"] as InstrumentId[]) {
    const series = assessmentsFor(id, assessments);
    if (series.length < 2) continue;
    const prev = series[series.length - 2], last = series[series.length - 1];
    if (diffDays(prev.date, last.date) < SCREEN_MIN_INTERVAL_DAYS) continue;
    const thr = ASSESSMENT_MCID[id];
    if (thr == null) continue;
    const delta = last.total - prev.total;
    let direction: InflectionDirection | null = null;
    if (delta >= thr) direction = "deterioration";
    else if (delta <= -thr) direction = "improvement";
    if (!direction) continue;
    const caveat = id === "GAD-7" ? " (GAD-7's reliable-change benchmark is less-replicated than PHQ-9's.)" : "";
    out.push({
      id: `screening_change|${id}|${direction}|${last.id}`,
      kind: "screening_change", direction, metric: id as "PHQ-9" | "GAD-7",
      detail: `Your ${id} went from ${prev.total} (${prev.severity}, ${prettyDate(prev.date)}) to ${last.total} (${last.severity}, ${prettyDate(last.date)}) — ${delta > 0 ? "+" : ""}${delta} points.`,
      opener: openerFor("screening_change", direction, id),
      basis: `A change of ≥${thr} points on the ${id} is the recognised reliable-change benchmark.${caveat} A trend to discuss with a professional — never a diagnosis.`,
      date: today, dataPoints: series.length,
    });
  }

  // mood_trend — valence-derived per-day distress, own-baseline + persistence
  const byDay = new Map<string, number[]>();
  for (const c of checkins) {
    if (!c?.date) continue;
    const arr = byDay.get(c.date) ?? [];
    arr.push(emotionDistress(c.emotion || "", Number(c.intensity)));
    byDay.set(c.date, arr);
  }
  const recent: number[] = [], baseline: number[] = [];
  for (const [date, ds] of byDay) {
    const dd = diffDays(date, today);
    if (dd < 0) continue;
    const dayDistress = mean(ds);
    if (dd < RECENT_DAYS) recent.push(dayDistress);
    else if (dd < BASELINE_DAYS) baseline.push(dayDistress);
  }
  if (recent.length >= MIN_RECENT && baseline.length >= MIN_BASELINE) {
    const base = mean(baseline), sd = sampleStdev(baseline), recentMean = mean(recent);
    const margin = Math.max(MARGIN_FLOOR, MARGIN_SD_K * sd);
    const upN = recent.filter((d) => d - base >= margin).length;
    const downN = recent.filter((d) => base - d >= margin).length;
    let direction: InflectionDirection | null = null;
    if (recentMean - base >= margin && upN >= MIN_PERSIST && upN / recent.length >= PERSIST_RATIO) direction = "deterioration";
    else if (base - recentMean >= margin && downN >= MIN_PERSIST && downN / recent.length >= PERSIST_RATIO) direction = "improvement";
    if (direction) {
      out.push({
        id: `mood_trend|mood|${direction}|${isoWeek(today)}`,
        kind: "mood_trend", direction, metric: "mood",
        detail: `Your harder-feeling check-ins have run a bit ${direction === "deterioration" ? "higher" : "lower"} over the last 10 days than your usual couple-month range.`,
        opener: openerFor("mood_trend", direction, "mood"),
        basis: "Compared with your own typical range over the past two months, held across most of the recent days. A heuristic we tune over time — not a clinical cutoff.",
        date: today, dataPoints: recent.length,
      });
    }
  }
  return out;
}

// ── Store + throttle + surfacing orchestration ──

export interface InflectionAck { response: "fits" | "dismissed"; date: string; }
interface InflectionStore { log: (InflectionSignal & { surfaced: boolean })[]; acks: Record<string, InflectionAck>; }

const STORE_KEY = "nilamind_inflection";               // SENSITIVE (encrypted)
const CHECKED_KEY = "nilamind_inflection_checked";     // plain localStorage, local date
const SURFACED_KEY = "nilamind_inflection_surfaced";   // plain localStorage, local date
const LOG_CAP = 30, COOLDOWN_DAYS = 14, SCREEN_RECENCY_DAYS = 21;

function loadStore(): InflectionStore {
  try {
    const raw = secureLocal.getItem(STORE_KEY);
    const p = raw ? JSON.parse(raw) : null;
    return p && Array.isArray(p.log) && p.acks && typeof p.acks === "object" ? p : { log: [], acks: {} };
  } catch { return { log: [], acks: {} }; }
}
function saveStore(s: InflectionStore): void {
  try { s.log = s.log.slice(-LOG_CAP); secureLocal.setItem(STORE_KEY, JSON.stringify(s)); }
  catch (e) { console.error("Failed to save inflection store:", e); }
}
function readCheckins(): CheckInEntry[] {
  try { const raw = secureLocal.getItem("nilamind_checkins"); const p = raw ? JSON.parse(raw) : []; return Array.isArray(p) ? p : []; }
  catch { return []; }
}
function plainGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function plainSet(k: string, v: string): void { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

/** Once/local-day: detect + append any new signal to the always-on private log (runs even when surfacing is off). */
export function recordDetectionPass(): void {
  try {
    const today = ymd(new Date());
    if (plainGet(CHECKED_KEY) === today) return;
    plainSet(CHECKED_KEY, today);
    const signals = detectInflections(readCheckins(), loadAssessments(), today);
    const s = loadStore();
    for (const sig of signals) if (!s.log.some((l) => l.id === sig.id)) s.log.push({ ...sig, surfaced: false });
    saveStore(s);
  } catch { /* best-effort */ }
}

/** The one signal eligible to surface now (cooldown + screening-recency + priority), or null. Pure read. */
export function topFireableSignal(): InflectionSignal | null {
  const today = ymd(new Date());
  const assessments = loadAssessments();
  const signals = detectInflections(readCheckins(), assessments, today);
  const s = loadStore();
  const eligible = signals.filter((sig) => {
    const ack = s.acks[sig.id];
    if (ack && diffDays(ack.date, today) < COOLDOWN_DAYS) return false;
    if (sig.kind === "screening_change") {
      const ds = daysSince(latestFor(sig.metric as InstrumentId, assessments));
      if (ds == null || ds > SCREEN_RECENCY_DAYS) return false; // stale rise: log only, don't speak
    }
    return true;
  });
  const rank = (sig: InflectionSignal) => (sig.kind === "screening_change" ? 0 : 2) + (sig.direction === "deterioration" ? 0 : 1);
  eligible.sort((a, b) => rank(a) - rank(b));
  return eligible[0] ?? null;
}

export function shouldSurfaceToday(): boolean { return plainGet(SURFACED_KEY) !== ymd(new Date()); }

/** Pick + commit an opener for this open (≤1/day). Caller must have checked getInflectionEnabled(). */
export function surfaceOpener(): InflectionSignal | null {
  if (!shouldSurfaceToday()) return null;
  const sig = topFireableSignal();
  if (!sig) return null;
  plainSet(SURFACED_KEY, ymd(new Date()));
  const s = loadStore();
  const entry = s.log.find((l) => l.id === sig.id);
  if (entry) entry.surfaced = true; else s.log.push({ ...sig, surfaced: true });
  saveStore(s);
  return sig;
}

export function acknowledgeInflection(id: string, response: "fits" | "dismissed"): void {
  const s = loadStore();
  s.acks[id] = { response, date: ymd(new Date()) };
  const entry = s.log.find((l) => l.id === id);
  if (entry) entry.surfaced = true;
  saveStore(s);
}

/** Per-row wave-off in the review log: cools the signal AND hides it from the log view. */
export function dismissLoggedSignal(id: string): void { acknowledgeInflection(id, "dismissed"); }

/** Newest-first log rows for the review screen, excluding rows the user dismissed. */
export function latestInflectionsForLog(n = 10): (InflectionSignal & { surfaced: boolean })[] {
  const s = loadStore();
  return [...s.log].reverse().filter((l) => s.acks[l.id]?.response !== "dismissed").slice(0, n);
}

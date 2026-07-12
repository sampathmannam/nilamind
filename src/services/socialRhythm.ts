// Social Rhythm Metric (SRM) — a self-tracking tool for the *regularity* of daily routine anchors.
//
// WHY: in Interpersonal & Social Rhythm Therapy (IPSRT), stabilising the daily timing of routine
// "zeitgebers" (social time-givers) is the therapeutic target for mood stability — especially in bipolar
// disorder, which is NilaMind's manic-first focus. The instrument is the SRM (Monk et al. 1990/1991); its
// use in IPSRT is Frank et al. 2005. This is an SRM-*inspired* self-tracking metric, NOT the full validated
// SRM-II scoring, and its evidence is bipolar-specific and rests on a small number of trials — see the
// honest limit surfaced in the UI. Everything is on-device (encrypted at rest); nothing is sent anywhere.

import { secureLocal } from "./secureLocal";
import { dayKey } from "./retentionMetrics";

const RHYTHM_KEY = "nilamind_social_rhythm";
/** Minimum distinct days before we surface a regularity read — below this it's noise (cf. patternInsights MIN_GROUP). */
export const MIN_RHYTHM_DAYS = 5;
/** Default look-back window. */
export const RHYTHM_WINDOW_DAYS = 14;
const TWO_PI = Math.PI * 2;

/** The five SRM anchors, in the order they're asked. */
export const RHYTHM_ANCHORS: { key: AnchorKey; label: string }[] = [
  { key: "wake", label: "Out of bed" },
  { key: "firstContact", label: "First contact with someone" },
  { key: "startActivity", label: "Started the day's main activity" },
  { key: "dinner", label: "Dinner" },
  { key: "bed", label: "To bed" },
];

export type AnchorKey = "wake" | "firstContact" | "startActivity" | "dinner" | "bed";
export type RhythmAnchors = Partial<Record<AnchorKey, string>>; // each value "HH:MM"

export interface RhythmEntry {
  date: string; // UTC day YYYY-MM-DD
  anchors: RhythmAnchors;
}

/** "HH:MM" -> minutes since midnight, or null if malformed. */
export function parseTime(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = +m[1], mm = +m[2];
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

function fmtTime(min: number): string {
  const h = Math.floor(min / 60) % 24, m = Math.round(min) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Circular mean + standard deviation of times-of-day (minutes), on a 24h clock — so a bedtime of 23:50 and
 * 00:10 average to ~midnight (SD ~20 min), not to noon (SD ~12h) as a naive linear mean would give.
 */
export function circularStats(mins: number[]): { meanMin: number; sdMin: number } {
  let C = 0, S = 0;
  for (const t of mins) { const a = (t / 1440) * TWO_PI; C += Math.cos(a); S += Math.sin(a); }
  C /= mins.length; S /= mins.length;
  const R = Math.min(1, Math.sqrt(C * C + S * S));
  let meanAngle = Math.atan2(S, C);
  if (meanAngle < 0) meanAngle += TWO_PI;
  const meanMin = Math.round((meanAngle / TWO_PI) * 1440) % 1440;
  // Circular SD = sqrt(-2 ln R); R→1 is perfectly regular (0), R→0 is uniform (capped at 720 min = 12h).
  const sdRad = R > 1e-6 ? Math.sqrt(-2 * Math.log(R)) : Math.PI;
  const sdMin = Math.max(0, Math.min(720, Math.round((sdRad / TWO_PI) * 1440))); // max(0,…) also normalizes -0
  return { meanMin, sdMin };
}

export function loadRhythm(): RhythmEntry[] {
  try {
    const raw = secureLocal.getItem(RHYTHM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RhythmEntry => e && typeof e.date === "string" && e.anchors && typeof e.anchors === "object",
    );
  } catch {
    return [];
  }
}

function save(entries: RhythmEntry[]): void {
  try { secureLocal.setItem(RHYTHM_KEY, JSON.stringify(entries)); } catch { /* best-effort — never throw */ }
}

/** True if the user has logged at least one anchor today. */
export function hasRhythmToday(now: Date = new Date()): boolean {
  const date = dayKey(now);
  return loadRhythm().some((e) => e.date === date);
}

/** Returns today's anchors if any, or null. */
export function loadTodayAnchors(now: Date = new Date()): RhythmAnchors | null {
  const date = dayKey(now);
  return loadRhythm().find((e) => e.date === date)?.anchors ?? null;
}

/** Upsert today's anchors (merges with any already logged for the day). Empty/malformed times are ignored. */
export function recordRhythm(anchors: RhythmAnchors, now: Date = new Date()): void {
  const date = dayKey(now);
  const clean: RhythmAnchors = {};
  for (const { key } of RHYTHM_ANCHORS) {
    const v = anchors[key];
    if (typeof v === "string" && parseTime(v) !== null) clean[key] = v;
  }
  const entries = loadRhythm();
  const existing = entries.find((e) => e.date === date);
  if (existing) existing.anchors = { ...existing.anchors, ...clean };
  else entries.push({ date, anchors: clean });
  entries.sort((a, b) => a.date.localeCompare(b.date));
  save(entries);
}

export interface AnchorRegularity {
  key: AnchorKey;
  label: string;
  daysLogged: number;
  meanTime: string | null;
  variabilityMin: number | null; // circular SD in minutes; lower = more regular
}

export type RhythmBand = "regular" | "variable" | "irregular" | "insufficient";

export interface RhythmRegularity {
  daysLogged: number; // distinct days with ≥1 anchor in the window
  windowDays: number;
  anchors: AnchorRegularity[];
  overallVariabilityMin: number | null; // mean of per-anchor variability (anchors with ≥MIN_RHYTHM_DAYS)
  band: RhythmBand;
}

/** Band thresholds are self-reflection heuristics, NOT clinical cut-offs; the ±45-min SRM "hit" convention
 *  informs the "regular" boundary. */
function bandFor(sd: number | null, daysLogged: number): RhythmBand {
  if (daysLogged < MIN_RHYTHM_DAYS || sd === null) return "insufficient";
  if (sd < 45) return "regular";
  if (sd <= 90) return "variable";
  return "irregular";
}

/** Compute the on-device regularity read over the trailing window. Pure given the clock. */
export function computeRhythmRegularity(now: Date = new Date(), windowDays: number = RHYTHM_WINDOW_DAYS): RhythmRegularity {
  const today = Date.parse(`${dayKey(now)}T00:00:00Z`);
  const cutoff = today - (windowDays - 1) * 86_400_000;
  const inWindow = loadRhythm().filter((e) => {
    const t = Date.parse(`${e.date}T00:00:00Z`);
    return t >= cutoff && t <= today;
  });

  const anchors: AnchorRegularity[] = RHYTHM_ANCHORS.map(({ key, label }) => {
    const mins = inWindow
      .map((e) => (e.anchors[key] ? parseTime(e.anchors[key]!) : null))
      .filter((m): m is number => m !== null);
    if (mins.length === 0) return { key, label, daysLogged: 0, meanTime: null, variabilityMin: null };
    const { meanMin, sdMin } = circularStats(mins);
    return { key, label, daysLogged: mins.length, meanTime: fmtTime(meanMin), variabilityMin: sdMin };
  });

  const daysLogged = inWindow.length;
  const scored = anchors.filter((a) => a.daysLogged >= MIN_RHYTHM_DAYS && a.variabilityMin !== null);
  const overallVariabilityMin = scored.length
    ? Math.round(scored.reduce((s, a) => s + (a.variabilityMin ?? 0), 0) / scored.length)
    : null;

  return {
    daysLogged,
    windowDays,
    anchors,
    overallVariabilityMin,
    band: bandFor(overallVariabilityMin, daysLogged),
  };
}

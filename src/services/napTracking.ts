// P8.4 — nap tracking. Research (Milner & Cote 2014, J Sleep Res; a body of work on "sleepability") shows
// long daytime naps — especially >30 min and late in the day (after ~3pm) — correlate with poorer subsequent
// nighttime sleep and, in bipolar, can seed a mood-elevating rhythm disruption. Nila lets the user log a nap
// and, when a late-long nap pattern appears, gently surfaces the association (never as an alarm). The signal
// is a prompt-to-reflect, NOT a diagnosis. Roughly mirrors the short-sleep prodrome's sense→ask shape.
// Non-sensitive UI data → plain localStorage (sync, pre-gate safe), consistent with reminders.ts.

import { ls } from "./storageUtils";
import { selfReportedSleepNights } from "./sleepInsight";

export interface NapEntry {
  date: string; // local YYYY-MM-DD the nap occurred
  start: string; // "HH:MM" — when the nap began
  minutes: number; // nap length in minutes
}

const KEY = "nilamind_naps";
const NAP_AFTER_HOUR = 15; // 3pm
const NAP_MIN_THRESHOLD = 30; // minutes
const LOOKBACK_DAYS = 14;

const toHour = (hhmm: string): number => {
  const [h] = hhmm.split(":").map(Number);
  return h || 0;
};

/** A "late-long" nap: started at/after 3pm AND longer than 30 minutes — the disruption-associated kind. */
export function isLateLongNap(start: string, minutes: number): boolean {
  return toHour(start) >= NAP_AFTER_HOUR && minutes > NAP_MIN_THRESHOLD;
}

export function getNaps(): NapEntry[] {
  try {
    const raw = ls()?.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NapEntry[]) : [];
  } catch {
    return [];
  }
}

export function logNap(date: string, start: string, minutes: number): NapEntry {
  const entry: NapEntry = { date, start, minutes: Math.max(0, Math.round(minutes)) };
  const next = getNaps().filter((e) => !(e.date === date && e.start === start)).concat(entry);
  try { ls()?.setItem(KEY, JSON.stringify(next)); } catch { /* best-effort */ }
  return entry;
}

/** Days-ago helper for the lookback window. */
function daysAgoCutoff(now: Date, days: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function parseYmd(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getTime();
}

export interface NapSignal {
  firing: boolean;
  note: string;
}

/**
 * Gentle late-long-nap → nighttime-sleep association signal. Fires when a nap started at/after 3pm and lasted
 * >30 min within the last LOOKBACK_DAYS. If the following night's sleep was shorter than the user's own
 * average, the note names that pattern softly; otherwise it offers the general association.
 */
export function napDisruptionSignal(now: Date = new Date()): NapSignal {
  const cutoff = daysAgoCutoff(now, LOOKBACK_DAYS);
  const lateLong = getNaps().filter(
    (n) => isLateLongNap(n.start, n.minutes) && parseYmd(n.date) >= cutoff
  );
  if (lateLong.length === 0) return { firing: false, note: "" };

  // Correlate: was the night AFTER each nap shorter than the user's own average night?
  const nights = selfReportedSleepNights();
  const byDate = new Map(nights.map((n) => [n.date, n.hours]));
  const allHours = nights.map((n) => n.hours).filter((h) => h > 0);
  const avg = allHours.length ? allHours.reduce((a, b) => a + b, 0) / allHours.length : 0;

  const followingShorter = lateLong.filter((n) => {
    const next = new Date(parseYmd(n.date));
    next.setDate(next.getDate() + 1);
    const ny = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    const h = byDate.get(ny);
    return typeof h === "number" && avg > 0 && h < avg;
  });

  if (followingShorter.length > 0 && avg > 0) {
    return {
      firing: true,
      note:
        "A few of your longer afternoon naps came before shorter nights — there's a real link between late-day " +
        "napping and poorer nighttime sleep. If you can, a shorter early-afternoon rest (under 30 min) tends to be gentler on the night.",
    };
  }
  return {
    firing: true,
    note:
      "You've logged some longer naps in the afternoon. Long naps after about 3pm can make it harder to settle at " +
      "night — if sleep's been tricky, an earlier, shorter rest is often kinder to your rhythm.",
  };
}

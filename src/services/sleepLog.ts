// P8.1 — morning sleep log. When the user has no automatic sleep source (Health Connect off/unwired) we
// gently ask, on first app open of the morning, for last night's bedtime + wake time via a 2-tap entry.
// The entry is stored locally and feeds the same short-sleep prodrome signal as self-reported check-in sleep,
// so the manic-first early-warning upgrades automatically from this manual source too.
// Non-sensitive UI data → plain localStorage (sync, pre-gate safe), consistent with reminders.ts.

import { ls } from "./storageUtils";

export interface SleepLogEntry {
  date: string; // local YYYY-MM-DD of the wake day (the morning you woke)
  bedTime: string; // "HH:MM"
  wakeTime: string; // "HH:MM"
  hours: number; // derived nightly hours (handles midnight wrap)
}

const LOG_KEY = "nilamind_sleep_log";
const DISMISS_KEY = "nilamind_sleep_log_dismissed";

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Hours between a bedtime and wake time, wrapping past midnight (e.g. 23:00→07:00 = 8h). */
export function sleepHoursBetween(bedTime: string, wakeTime: string): number {
  const bed = toMin(bedTime);
  let wake = toMin(wakeTime);
  if (wake <= bed) wake += 24 * 60; // crossed midnight
  return Math.round(((wake - bed) / 60) * 10) / 10;
}

export function getSleepLog(): SleepLogEntry[] {
  try {
    const raw = ls()?.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SleepLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function hasSleepLogForDate(date: string): boolean {
  return getSleepLog().some((e) => e.date === date);
}

/** Record a night's sleep. Overwrites any existing entry for the same wake day. */
export function logSleepNight(date: string, bedTime: string, wakeTime: string): SleepLogEntry {
  const hours = sleepHoursBetween(bedTime, wakeTime);
  const entry: SleepLogEntry = { date, bedTime, wakeTime, hours };
  const next = getSleepLog().filter((e) => e.date !== date).concat(entry);
  try { ls()?.setItem(LOG_KEY, JSON.stringify(next)); } catch { /* best-effort */ }
  return entry;
}

/** Manual sleep nights in the SleepNight shape the sleep signal already consumes. */
export function manualSleepNights(): { date: string; hours: number }[] {
  return getSleepLog().map((e) => ({ date: e.date, hours: e.hours }));
}

export function markMorningSleepDismissed(date: string): void {
  try { ls()?.setItem(DISMISS_KEY, date); } catch { /* best-effort */ }
}

function dismissedToday(date: string): boolean {
  try { return ls()?.getItem(DISMISS_KEY) === date; } catch { return false; }
}

/** True when Nila should surface the morning sleep-log prompt: it's morning, no auto sleep source, and
 *  nothing has been logged or dismissed for today yet. */
export function shouldPromptMorningSleepLog(now: Date = new Date(), healthConnectEnabled = false): boolean {
  const h = now.getHours();
  const isMorning = h >= 5 && h < 12;
  if (!isMorning) return false;
  if (healthConnectEnabled) return false; // auto data covers it
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (hasSleepLogForDate(today)) return false;
  if (dismissedToday(today)) return false;
  return true;
}

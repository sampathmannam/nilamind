// Health Connect sleep + resting-HR read seam — the COROS Pace 3 path.
//
// WHY a seam (not a direct 3rd-party plugin import): the red-panel technical review showed phone-only
// sleep/circadian is not computable, and that the ONLY credible source is Health Connect fed by a wearable
// the user already owns. The user wears a COROS Pace 3, which syncs sleep + resting HR to Health Connect
// (COROS app → Profile → Settings → 3rd Party Apps → Health Connect). We code against OUR OWN minimal
// contract (`HealthConnectPlugin`) via registerPlugin, so this file compiles + ships with NO native
// dependency: if no native plugin is registered under "HealthConnect", every call rejects and we degrade
// to []. Nothing here changes live behaviour yet — it's an off-by-default, read-only data seam.
//
// ON-DEVICE WIRING (the step that needs your phone, flagged honestly — not done here):
//   1. add a Health Connect Capacitor plugin (community or a thin custom one) that registers as
//      "HealthConnect" and fulfils the contract below (isAvailable / requestPermissions / readSleep);
//   2. declare the Health Connect read permissions in AndroidManifest (SleepSession, RestingHeartRate);
//   3. install the Health Connect app + grant NilaMind read access; enable COROS → Health Connect sync;
//   4. flip setHealthConnectEnabled(true) and verify readRecentSleep() returns real nights.
// Privacy invariant holds: data is read on-device from Health Connect and never leaves the phone.

import { registerPlugin, Capacitor } from "@capacitor/core";

export interface SleepNight {
  date: string; // local YYYY-MM-DD of the night (keyed to wake day)
  hours: number;
}

/** The minimal contract NilaMind needs — a native plugin (or adapter) fulfils this. */
export interface HealthConnectPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestPermissions(opts: { read: string[] }): Promise<{ granted: boolean }>;
  /** Return raw sleep sessions in [startISO, endISO]; each at least { startTime, endTime } ISO strings. */
  readSleep(opts: { startISO: string; endISO: string }): Promise<{ sessions: Array<{ startTime: string; endTime: string }> }>;
}

const HC = registerPlugin<HealthConnectPlugin>("HealthConnect");

// ── off-by-default feature flag (mirrors inflectionPrefs) ──
const KEY = "nilamind_healthconnect";
const ls = (): Storage | null => { try { return (globalThis as any).localStorage ?? null; } catch { return null; } };
export function isHealthConnectEnabled(): boolean { try { return ls()?.getItem(KEY) === "1"; } catch { return false; } }
export function setHealthConnectEnabled(v: boolean): void { try { ls()?.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ } }

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** PURE: collapse raw Health Connect sleep sessions to one {date, hours} per night (keyed to the wake day,
 *  summing fragmented sessions). Exported for unit testing without the native side. */
export function mapSleepSessions(sessions: Array<{ startTime: string; endTime: string }>): SleepNight[] {
  const byDay = new Map<string, number>();
  for (const s of sessions || []) {
    const start = Date.parse(s?.startTime), end = Date.parse(s?.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const hours = (end - start) / 3_600_000;
    if (hours <= 0 || hours > 24) continue; // guard garbage
    const wakeDay = ymd(new Date(end)); // key to the morning you woke
    byDay.set(wakeDay, (byDay.get(wakeDay) ?? 0) + hours);
  }
  return [...byDay.entries()].map(([date, hours]) => ({ date, hours: Math.round(hours * 10) / 10 })).sort((a, b) => a.date.localeCompare(b.date));
}

/** Read the last `days` of sleep from Health Connect. Returns [] on web, when the flag is off, when no
 *  native plugin is registered, or on any error — so callers degrade gracefully. */
export async function readRecentSleep(days = 60): Promise<SleepNight[]> {
  if (!Capacitor.isNativePlatform() || !isHealthConnectEnabled()) return [];
  try {
    const avail = await HC.isAvailable();
    if (!avail?.available) return [];
    const end = new Date();
    const start = new Date(end.getTime() - days * 86_400_000);
    const res = await HC.readSleep({ startISO: start.toISOString(), endISO: end.toISOString() });
    return mapSleepSessions(res?.sessions ?? []);
  } catch {
    return []; // no plugin / no permission / read error → no signal, never a crash
  }
}

// ── the research-grounded EARLY-WARNING brain (PURE, testable independent of Health Connect) ──
// Shrinking sleep is the earliest + highest-yield manic prodrome (Lim 2024 npj Digit Med; Lewis 2017
// Br J Psychiatry; Jackson 2003). We fire on a persistent RUN of nights reduced vs the person's OWN
// baseline, OR under an absolute short-sleep floor — never on a single off night, and never below baseline.
const ABS_FLOOR_H = 5;     // nights under this are "short" regardless of baseline (manic red flag)
const DROP_H = 1.5;        // hours at/below (baseline − this) counts as "reduced"
const MIN_RUN = 3;         // consecutive reduced nights required to fire
const MIN_BASELINE = 7;    // need at least this many older nights to form a personal baseline

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface SleepSignal {
  firing: boolean;
  nightsBelow: number;
  baselineHours: number;
  detail: string;
}

/** PURE. Detect a manic-prodrome short-sleep run from the person's own nights. null = not enough data.
 *  This is a SIGNAL to gently ask, never an alarm — consistent with the doc's sense→ask→confirm rule. */
export function shortSleepSignal(nights: SleepNight[]): SleepSignal | null {
  const sorted = [...(nights || [])].filter((n) => Number.isFinite(n?.hours)).sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < MIN_BASELINE + MIN_RUN) return null; // can't judge yet (cold-start)
  const hrs = sorted.map((n) => n.hours);
  const baselineHours = median(hrs.slice(0, hrs.length - MIN_RUN)); // older nights = the personal baseline
  let run = 0;
  for (let i = hrs.length - 1; i >= 0; i--) {
    const reduced = hrs[i] < ABS_FLOOR_H || hrs[i] <= baselineHours - DROP_H;
    if (reduced) run++;
    else break;
  }
  const firing = run >= MIN_RUN;
  const b = Math.round(baselineHours * 10) / 10;
  return {
    firing,
    nightsBelow: run,
    baselineHours: b,
    detail: firing
      ? `${run} nights running below your usual (~${b}h). Shrinking sleep is the earliest manic warning — worth a gentle check-in, not a conclusion.`
      : `Sleep is within your usual range (~${b}h).`,
  };
}

// Live sleep early-warning — wired to whatever sleep data exists today.
//
// The manic-prodrome short-sleep signal (healthConnect.shortSleepSignal — Lim 2024 / Lewis 2017) needs
// nightly sleep hours. Two sources, preferred in order:
//   1. Health Connect (a wearable, e.g. the COROS Pace 3) — automatic + dense — once the native plugin
//      is wired + granted (readRecentSleep; returns [] until then);
//   2. the user's OWN self-reported sleep from check-ins (CheckInEntry.sleepHours, surfaced per-day by
//      loadMoodHistory) — works TODAY, no wearable needed.
// So the signal is live now from self-report and upgrades automatically when the watch is connected.
// Read-only + on-device; the signal is a prompt-to-ask, never an alarm (the doc's sense→ask→confirm rule).

import { loadMoodHistory } from "./moodHistory";
import { shortSleepSignal, readRecentSleep, type SleepNight, type SleepSignal } from "./healthConnect";

/** The user's self-reported sleep (check-in sleepHours), one night per logged day. Sync, on-device. */
export function selfReportedSleepNights(): SleepNight[] {
  const out: SleepNight[] = [];
  for (const m of loadMoodHistory()) {
    if (typeof m.sleepHours === "number" && m.sleepHours > 0) out.push({ date: m.date, hours: m.sleepHours });
  }
  return out;
}

/** Sleep signal from SELF-REPORT only — sync, available today without any wearable. */
export function selfReportSleepSignal(): SleepSignal | null {
  return shortSleepSignal(selfReportedSleepNights());
}

/** Best available sleep signal: Health Connect (wearable) when wired + granted, else self-report. */
export async function currentSleepSignal(): Promise<SleepSignal | null> {
  const fromWearable = await readRecentSleep(60);
  const nights = fromWearable.length ? fromWearable : selfReportedSleepNights();
  return shortSleepSignal(nights);
}

// Clinician-report period scoping — pure, deterministic, on-device.
// Extracted from YourDataScreen's export handler so the time-period filtering and
// the on-device "usage" aggregation are unit-testable in node (no Capacitor).
// Everything here reads only on-device stores; nothing leaves the device.

import { loadMoodHistory } from "./moodHistory";
import { localDateKey } from "./storageUtils";
import { loadAppOpens } from "./retentionMetrics";
import { loadNilaTurns, type NilaTurn } from "./nilaSessions";
import { featureAdoption, retentionSnapshot, type RetentionSnapshot } from "./usageAnalytics";

export type ReportPeriod = 7 | 30 | 90;

/** Inclusive start date (YYYY-MM-DD) for a `days`-long window ending today. */
export function periodCutoffIso(days: number, now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return localDateKey(d);
}

/** Keep only records whose `date` (YYYY-MM-DD) is within the window. Lexicographic compare is
 *  valid because the dates are zero-padded ISO. */
export function filterByDate<T extends { date: string }>(items: T[], cutoff: string): T[] {
  return items.filter((i) => i.date >= cutoff);
}

/** Count protocol completions whose `at` (ISO) falls in the window. */
export function protocolsCompletedInPeriod(
  completions: Array<{ at?: string }>,
  cutoff: string,
): number {
  return completions.filter((c) => (c.at ?? "").slice(0, 10) >= cutoff).length;
}

/** Distinct app-open days (YYYY-MM-DD keys) within the window. */
export function appOpenDaysInPeriod(dayKeys: string[], cutoff: string): number {
  return dayKeys.filter((d) => d >= cutoff).length;
}

/** Nila conversation turns within the window. */
export function nilaTurnsInPeriod(turns: Array<{ date: string }>, cutoff: string): number {
  return turns.filter((t) => (t.date || "") >= cutoff).length;
}

export interface ClinicianUsage {
  periodDays: number;
  cutoff: string;
  daysActive: number;
  appOpenDays: number;
  nilaTurns: number;
  avgSleepHours: number | null;
  featuresUsed: string[];
  /** Self-retention / consistency (on-device only — no cross-user cohort, per privacy promise). */
  retention: RetentionSnapshot;
}

/**
 * Gather the on-device usage + sleep signals for the window. This is the "how has the
 * person actually been using the app / how are they sleeping" block — derived entirely from
 * stores already on the device (no OS-level call logs, per the privacy promise).
 */
export function gatherClinicianUsage(
  periodDays: ReportPeriod,
  now: Date = new Date(),
): ClinicianUsage {
  const cutoff = periodCutoffIso(periodDays, now);
  const mood = filterByDate(loadMoodHistory(), cutoff);
  const sleeps = mood
    .filter((m) => typeof m.sleepHours === "number" && m.sleepHours > 0)
    .map((m) => m.sleepHours as number);
  const avgSleepHours =
    sleeps.length > 0 ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null;

  return {
    periodDays,
    cutoff,
    daysActive: mood.length,
    appOpenDays: appOpenDaysInPeriod(loadAppOpens(), cutoff),
    nilaTurns: nilaTurnsInPeriod(loadNilaTurns(), cutoff),
    avgSleepHours,
    featuresUsed: featureAdoption(),
    retention: retentionSnapshot(now),
  };
}

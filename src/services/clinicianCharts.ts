// Pure data-shaping for the clinician PDF's chart dashboard. No DOM/jsPDF here on purpose —
// this is the layer that decides *what the numbers are*; clinicianPdf.ts decides how to draw them.
//
// Design is research-grounded (see product-brainstorming session, 2026-07-16):
//  - A trend built from 1-2 points is not a trend — it's misleading to draw a line through it.
//    MIN_TREND_POINTS gates every series so the renderer can fall back to an honest
//    "not enough data yet" state instead of a chart that implies more certainty than exists
//    (cf. uncertainty-visualization research: hard/confident-looking charts on sparse data
//    cause viewers to misread them as settled fact).
//  - No composite risk score/gauge here on purpose: FDA's 2022 Final CDS Guidance excludes
//    software that surfaces "a risk probability or risk score for a disease" from the
//    Non-Device CDS exemption unless it discloses validation methodology, which this never
//    had; automation-bias research (Khera, Simon, Ross 2023, JAMA; Putica et al. 2025,
//    Psychological Medicine) is the other reason. A gauge is a *more* verdict-like
//    presentation of the same score than text, not a safer one.

import type { CheckInEntry } from "../types";
import type { ClinicianMedication } from "./clinicianReport";
import { localDateKey } from "./storageUtils";

/** Below this many distinct days, a line chart implies a trend that isn't there. */
const MIN_TREND_POINTS = 3;

function distinctByDateSorted<T extends { date: string }>(items: T[]): T[] {
  const byDate = new Map<string, T>();
  for (const item of items) byDate.set(item.date, item); // last check-in of the day wins
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export interface IntensityPoint {
  date: string;
  intensity: number;
}

export interface IntensitySeries {
  points: IntensityPoint[];
  sufficient: boolean;
}

/** Distress-intensity trend from check-ins within the window, one point per day (latest check-in wins). */
export function buildIntensitySeries(checkins: CheckInEntry[], cutoff: string): IntensitySeries {
  const inWindow = checkins.filter((c) => c.date >= cutoff && typeof c.intensity === "number");
  const points = distinctByDateSorted(inWindow).map((c) => ({ date: c.date, intensity: c.intensity }));
  return { points, sufficient: points.length >= MIN_TREND_POINTS };
}

export interface SleepPoint {
  date: string;
  hours: number;
}

export interface SleepSeries {
  points: SleepPoint[];
  sufficient: boolean;
}

/** Sleep-hours series from check-ins within the window. Zero/absent sleepHours means "not logged", not "0h". */
export function buildSleepSeries(checkins: CheckInEntry[], cutoff: string): SleepSeries {
  const inWindow = checkins.filter(
    (c) => c.date >= cutoff && typeof c.sleepHours === "number" && (c.sleepHours as number) > 0,
  );
  const points = distinctByDateSorted(inWindow).map((c) => ({ date: c.date, hours: c.sleepHours as number }));
  return { points, sufficient: points.length >= MIN_TREND_POINTS };
}

export interface FactorBar {
  label: string;
  pct: number;
}

/** Medication adherence as labeled bars. */
export function buildAdherenceBars(medications: ClinicianMedication[]): FactorBar[] {
  return medications.map((m) => ({ label: `${m.name} ${m.dose}`, pct: Math.round(m.adherenceRate) }));
}

export interface EngagementDay {
  date: string;
  active: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parses a "YYYY-MM-DD" string as a UTC midnight instant, independent of the device's local timezone —
 *  calendar-day arithmetic must not drift by a day depending on where the phone thinks it is. */
function toUtcMidnight(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** One entry per calendar day from `cutoff` to `now` (inclusive), for a scannable dot-strip. */
export function buildEngagementStrip(activeDayKeys: string[], cutoff: string, now: Date = new Date()): EngagementDay[] {
  const active = new Set(activeDayKeys);
  const days: EngagementDay[] = [];
  const start = toUtcMidnight(cutoff);
  const end = toUtcMidnight(localDateKey(now));
  for (let t = start; t <= end; t += DAY_MS) {
    const iso = new Date(t).toISOString().slice(0, 10);
    days.push({ date: iso, active: active.has(iso) });
  }
  return days;
}

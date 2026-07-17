// Phase 20 (Holistic Clinician Report) — pure deterministic aggregators of existing on-device stores.
//
// These functions pull data the clinician PDF (clinicianReport.ts) already needed but did not aggregate.
// Each one is:
//   - pure (no Date.now() without an injected `now` parameter for staleness math)
//   - privacy-respecting (NEVER return raw PII fields a senior clinician did not ask for explicitly)
//   - tolerant of missing / corrupt storage (returns an empty summary; never throws)
//
// Wire to: clinicianReport.ts via ClinicianReportInput extensions, fed by YourDataScreen.tsx.

import { isPactStale, type Pact } from "./pact";
import { loadConnections, type ConnectionRecord } from "./humanConnection";

/** B8 — social connection log summary for the clinician PDF. Privacy: raw dates/people never leave. */

/**
 * Status summary of the patient's pact (the "letter to my unwell self" + named trusted person).
 * Includes only metadata the patient has consented to by storing; never the name or letter content.
 */
export interface ClinicianPactForReport {
  /** True iff the patient has a saved, non-empty pact. */
  exists: boolean;
  /** True iff the pact records a non-whitespace trusted-person name. */
  hasName: boolean;
  /** True iff the pact records a non-whitespace contact for the trusted person. */
  hasContact: boolean;
  /** ISO date (YYYY-MM-DD) the pact was first written, or null. */
  writtenAt: string | null;
  /** ISO date (YYYY-MM-DD) the patient last re-confirmed the pact, or null. */
  ratifiedAt: string | null;
  /** True iff the last re-confirmation was more than 90 days before `now`. */
  isStale: boolean;
}

/**
 * Reduce the on-device {@link Pact} (or null) to a privacy-respecting summary for the clinician PDF.
 *
 * Research basis (Phase 20 design): the pact exists to ensure the patient has named support and
 * self-authored instructions for future unwell moments. A clinician seeing the file benefits from
 * knowing (a) the patient has such an arrangement, (b) whether contact info is on it, (c) whether
 * it is stale (the well-self should re-confirm). They do NOT benefit from the letter text or the
 * named person's identity on a share sheet — that is PHI the patient did not consent to export.
 */
export function summarizePactForReport(
  pact: Pact | null,
  now: Date = new Date(),
): ClinicianPactForReport {
  if (!pact) {
    return {
      exists: false,
      hasName: false,
      hasContact: false,
      writtenAt: null,
      ratifiedAt: null,
      isStale: false,
    };
  }
  const hasName = !!pact.person?.name?.trim();
  const hasContact = !!pact.person?.contact?.trim();
  return {
    exists: true,
    hasName,
    hasContact,
    writtenAt: pact.writtenAt ? pact.writtenAt.slice(0, 10) : null,
    ratifiedAt: pact.ratifiedAt ? pact.ratifiedAt.slice(0, 10) : null,
    isStale: isPactStale(pact, now.toISOString()),
  };
}

// ---- B8: human connection summary --------------------------------------------

export interface ClinicianConnectionsForReport {
  /** True if any connection records exist in the period. */
  hasData: boolean;
  /** Total connections logged in the window. */
  totalConnections: number;
  /** Breakdown by ConnectionType string key: { call: N, text: N, in_person: N, video: N, other: N }. */
  byType: Record<string, number>;
  /** Connection level (low/adequate/strong) over the most-recent 7 days — matches nilaContext signal. */
  recentLevel: "low" | "adequate" | "strong";
  /** Number of connections in the last-7-day window. */
  lastWeekCount: number;
  /** True if the patient was "low" on 50%+ of their weeks in the window (chronically isolated). */
  persistentlyLow: boolean;
  /** Weekly connection counts: {week: YYYY-MM-DD (Monday), count}. Never empty if hasData. */
  weeklyCounts: Array<{ week: string; count: number }>;
}

/** PURE. Summarise on-device connection records for the clinician PDF.
 *
 * What the clinician gets: how often the patient connected with others, by what means,
 * whether the last week was isolated, and whether the whole period shows chronic isolation.
 * The clinician CANNOT see specific dates, people, or locations — only counts and types.
 *
 * @param records  ConnectionRecord[] from secureLocal — pre-filtered by the caller to the report window.
 * @param now      Date used to compute the 7-day "recent" window. Inject for test stability.
 */
export function summarizeConnectionsForReport(
  records: ConnectionRecord[],
  now: Date = new Date(),
): ClinicianConnectionsForReport {
  if (!records || records.length === 0) {
    return {
      hasData: false,
      totalConnections: 0,
      byType: {},
      recentLevel: "low",
      lastWeekCount: 0,
      persistentlyLow: false,
      weeklyCounts: [],
    };
  }

  const byType: Record<string, number> = {};
  for (const r of records) {
    byType[r.type] = (byType[r.type] || 0) + 1;
  }

  // Assess recent 7-day level (same logic as nilaContext's connectionContextBlock).
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const lastWeekRecords = records.filter((r) => {
    const d = new Date(r.date + "T12:00:00Z");
    return d >= sevenDaysAgo && d <= now;
  });
  const lastWeekCount = lastWeekRecords.length;
  let recentLevel: "low" | "adequate" | "strong" = "low";
  if (lastWeekCount >= 5) recentLevel = "strong";
  else if (lastWeekCount >= 3) recentLevel = "adequate";

  // Weekly bucketing (ISO week, Monday start) to assess chronic isolation.
  const weekBuckets = new Map<string, number>();
  for (const r of records) {
    const d = new Date(r.date + "T12:00:00Z");
    // getISOWeek + year gives unique week ID; or just count Mon-Sun.
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // shift to Monday
    const weekKey = mon.toISOString().slice(0, 10);
    weekBuckets.set(weekKey, (weekBuckets.get(weekKey) || 0) + 1);
  }
  const weeklyCounts = Array.from(weekBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  // Persistently low = low on >= 50% of weeks that had >= 1 record.
  const weeks = Array.from(weekBuckets.keys()).sort();
  let lowWeeks = 0;
  for (const week of weeks) {
    const count = weekBuckets.get(week) || 0;
    if (count < 3) lowWeeks++; // <3 connections/week = "low" per assessConnection thresholds (scaled to weekly)
  }
  const persistentlyLow = weeks.length > 0 && lowWeeks >= Math.ceil(weeks.length / 2);

  return {
    hasData: true,
    totalConnections: records.length,
    byType,
    recentLevel,
    lastWeekCount,
    persistentlyLow,
    weeklyCounts,
  };
}

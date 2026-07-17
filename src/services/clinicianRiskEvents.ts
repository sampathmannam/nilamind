// Phase 20.5 — Deterministic risk-event log for the clinician PDF.
// 🟡 FLAGGED: must never produce risk levels / scores / gauges / recommendations.
// Per F11/F13/F14: we surface EVENTS (a dated list) and let the clinician decide.
// No clinical language, no severity labels, no "risk level" words.

/**
 * A single event in the dated timeline.
 * Types are structural (what was logged), not clinical judgments.
 */
export interface RiskEventLogEntry {
  date: string; // YYYY-MM-DD
  type: "elevated_distress" | "prodrome" | "diary_notable" | "episode";
  /** Optional structural detail (e.g. prodrome kind: "short_sleep"). Never a severity label. */
  detail?: string;
}

export interface RiskEventLogForReport {
  hasData: boolean;
  events: RiskEventLogEntry[];
}

/**
 * PURE. Build a deterministic, dated event-log from the patient's existing on-device data.
 *
 * This module aggregates four independent event sources — all already computed elsewhere —
 * into a single timeline sorted by date. The clinician sees "what happened when" without
 * any label, score, or recommendation. The clinician decides what it means.
 *
 * Event sources (all deterministic, none involve ML or the LLM):
 *   - Elevated-distress days: days where the patient's check-in intensity exceeded a threshold.
 *   - Prodrome events: sleep/energy/circadian disruption signals already computed by elevationGuard.
 *   - Diary notable days: DBT diary-card days flagged as notable (misery ≥4 or urge acted on).
 *   - Episode dates: days the patient logged a formal episode.
 *
 * @param sources Object containing arrays of dates/flags from each source.
 */
export function buildRiskEventLog(sources: {
  elevatedDistressDays: string[];
  prodromeEvents: Array<{ date: string; kind: string }>;
  diaryNotableDays: Array<{ date: string; reason: string }>;
  episodeDates: string[];
}): RiskEventLogForReport {
  const events: RiskEventLogEntry[] = [];

  for (const date of sources.elevatedDistressDays) {
    events.push({ date, type: "elevated_distress" });
  }

  for (const pe of sources.prodromeEvents) {
    events.push({ date: pe.date, type: "prodrome", detail: pe.kind });
  }

  for (const dn of sources.diaryNotableDays) {
    events.push({ date: dn.date, type: "diary_notable", detail: dn.reason });
  }

  for (const date of sources.episodeDates) {
    events.push({ date, type: "episode" });
  }

  // Sort by date descending (most recent first), cap at 20.
  events.sort((a, b) => b.date.localeCompare(a.date));
  const capped = events.slice(0, 20);

  return { hasData: capped.length > 0, events: capped };
}

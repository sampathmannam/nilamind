// wellbeingTrack — the longitudinal layer around the validated WHO-5 Well-Being Index.
//
// The measure itself lives in assessments.ts (WHO-5). This module adds what was missing:
// a fortnightly CADENCE prompt and a plain-language LONGITUDINAL summary used by the Dashboard
// card, the You-hub "Wellbeing over time" screen, and (lightly) the chat context.
//
// We deliberately reuse the validated WHO-5 instrument — we never invent clinical items, reword
// them, or shift cut-offs, because the psychometrics only hold for the published form. Wellness,
// never therapy: this tracks a pattern over time, it is not a diagnosis.

import { localDateKey } from "./storageUtils";
import {
  loadAssessments,
  latestFor,
  assessmentsFor,
  type AssessmentEntry,
  type InstrumentId,
} from "./assessments";
import { outcomeStatus, type TrendDirection } from "./reliableChange";

/** Fortnightly cadence — matches the WHO-5 "over the last two weeks" recall window. */
export const WELLBEING_RECALL_DAYS = 14;

const DAY_MS = 86_400_000;

export interface WellbeingCadence {
  /** Days since the last WHO-5, or null if never taken. */
  daysSinceLast: number | null;
  /** Days until the next check is due (0 when due/overdue); null if never taken. */
  dueInDays: number | null;
  isDue: boolean;
}

export interface WellbeingLongitudinal {
  taken: boolean;
  latest: AssessmentEntry | null;
  daysSinceLast: number | null;
  dueInDays: number | null;
  isDue: boolean;
  trajectory: TrendDirection | "stable";
  currentTrend: "reliably_improved" | "reliably_deteriorated" | "no_reliable_change" | null;
  /** date → total (0–100) for charting. */
  series: { date: string; total: number }[];
  /** Plain-language, wellness-framed summary for cards/context. */
  summary: string;
}

function daysBetween(from: string, to: string): number | null {
  const t0 = new Date(from + "T00:00:00").getTime();
  const t1 = new Date(to + "T00:00:00").getTime();
  if (Number.isNaN(t0) || Number.isNaN(t1)) return null;
  return Math.max(0, Math.floor((t1 - t0) / DAY_MS));
}

/** WHO-5 entries only, sorted by date. Pass a pre-loaded array to stay side-effect free in tests. */
export function readWellbeingHistory(all?: AssessmentEntry[]): AssessmentEntry[] {
  return assessmentsFor("WHO-5", all ?? loadAssessments());
}

export function wellbeingCadence(history?: AssessmentEntry[], today?: string): WellbeingCadence {
  const t = today ?? localDateKey();
  const h = history ?? readWellbeingHistory();
  const last = latestFor("WHO-5", h);
  if (!last) return { daysSinceLast: null, dueInDays: null, isDue: true };
  const since = daysBetween(last.date, t) ?? 0;
  const dueIn = Math.max(0, WELLBEING_RECALL_DAYS - since);
  return { daysSinceLast: since, dueInDays: dueIn, isDue: since >= WELLBEING_RECALL_DAYS };
}

/** True when a fortnightly check is due (or overdue), or when none has ever been taken. */
export function isWellbeingDue(history?: AssessmentEntry[], today?: string): boolean {
  return wellbeingCadence(history, today).isDue;
}

export function wellbeingLongitudinal(history?: AssessmentEntry[], today?: string): WellbeingLongitudinal {
  const h = history ?? readWellbeingHistory();
  const status = outcomeStatus("WHO-5", h);
  const cadence = wellbeingCadence(h, today);
  return {
    taken: h.length > 0,
    latest: latestFor("WHO-5", h),
    daysSinceLast: cadence.daysSinceLast,
    dueInDays: cadence.dueInDays,
    isDue: cadence.isDue,
    trajectory: status.trajectory,
    currentTrend: status.current?.trend ?? null,
    series: status.history,
    summary: buildSummary(h, status, cadence),
  };
}

function buildSummary(
  h: AssessmentEntry[],
  status: ReturnType<typeof outcomeStatus>,
  cadence: WellbeingCadence,
): string {
  if (h.length === 0) {
    return "No wellbeing check-ins yet. A 2-week check helps you notice the long view, not just daily swings.";
  }
  const latest = h[h.length - 1];
  const trendWord =
    status.trajectory === "reliably_improved"
      ? "been steadily improving"
      : status.trajectory === "reliably_deteriorated"
        ? "drifted downward"
        : "been steady";
  const duePhrase = cadence.isDue
    ? "Your next check is due."
    : `Next check in ${cadence.dueInDays} day${cadence.dueInDays === 1 ? "" : "s"}.`;
  return `Wellbeing has ${trendWord} (last WHO-5 ${latest.total}/100). ${duePhrase}`;
}

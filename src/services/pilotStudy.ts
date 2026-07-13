// Opt-in "Research pilot" scaffolding (see docs/PILOT_PROTOCOL.md).
//
// Everything here is on-device and consented. Enrollment stamps a baseline day + an endpoint-due day; the
// pre/post comparison is computed from the assessments the user ALREADY takes (PHQ-9 / GAD-7 / WHO-5), and
// the result only ever leaves the phone via the user-initiated export. No network, no auto-collection, and
// NOTHING here changes a non-enrolled user's experience — it is gated entirely on getPilotState().enrolled.

import { secureLocal } from "./secureLocal";
import {
  loadAssessments,
  assessmentsFor,
  classifyChange,
  type AssessmentEntry,
  type InstrumentId,
  type ChangeClassification,
} from "./assessments";
import { dayKey } from "./retentionMetrics";

const PILOT_KEY = "nilamind_pilot";
const DAY_MS = 86_400_000;

/** The pre/post window. The protocol allows 28–42 days; we use a 4-week endpoint. */
export const PILOT_ENDPOINT_DAYS = 28;

/** Content-free reminder body (no user text / no mental-health disclosure on a lock screen). */
export const PILOT_ENDPOINT_REMINDER_BODY = "Your pilot check-in is ready — a couple of quick questions when you have a moment.";

/** Instruments the pilot compares pre/post. WHO-5 is higher-is-better; the symptom scales are lower-is-better. */
export const PILOT_INSTRUMENTS: { id: InstrumentId; label: string; higherIsBetter: boolean }[] = [
  { id: "PHQ-9", label: "PHQ-9 (depression, lower is better)", higherIsBetter: false },
  { id: "GAD-7", label: "GAD-7 (anxiety, lower is better)", higherIsBetter: false },
  { id: "WHO-5", label: "WHO-5 (wellbeing, higher is better)", higherIsBetter: true },
];

export interface PilotState {
  enrolled: boolean;
  enrolledDay: string;    // YYYY-MM-DD (UTC)
  endpointDueDay: string; // enrolledDay + PILOT_ENDPOINT_DAYS
  endpointReminderScheduled: boolean;
}

function addDays(day: string, n: number): string {
  return dayKey(new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS));
}

export function getPilotState(): PilotState | null {
  try {
    const raw = secureLocal.getItem(PILOT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p.enrolledDay !== "string") return null;
    return {
      enrolled: !!p.enrolled,
      enrolledDay: p.enrolledDay,
      endpointDueDay: typeof p.endpointDueDay === "string" ? p.endpointDueDay : addDays(p.enrolledDay, PILOT_ENDPOINT_DAYS),
      endpointReminderScheduled: !!p.endpointReminderScheduled,
    };
  } catch {
    return null;
  }
}

function save(p: PilotState): void {
  try { secureLocal.setItem(PILOT_KEY, JSON.stringify(p)); } catch { /* best-effort — never throw */ }
}

export function isPilotEnrolled(): boolean {
  return getPilotState()?.enrolled === true;
}

/** Enroll into the pilot today. Idempotent — a returning enrollee keeps their original baseline day. */
export function enrollPilot(now: Date = new Date()): PilotState {
  const existing = getPilotState();
  if (existing?.enrolled) return existing;
  const enrolledDay = dayKey(now);
  const state: PilotState = {
    enrolled: true,
    enrolledDay,
    endpointDueDay: addDays(enrolledDay, PILOT_ENDPOINT_DAYS),
    endpointReminderScheduled: false,
  };
  save(state);
  return state;
}

/** Withdraw — removes all pilot state. (The user's own assessments/retention are untouched and theirs.) */
export function withdrawPilot(): void {
  try { secureLocal.removeItem(PILOT_KEY); } catch { /* best-effort */ }
}

export function markEndpointReminderScheduled(): void {
  const s = getPilotState();
  if (s?.enrolled) save({ ...s, endpointReminderScheduled: true });
}

export interface PilotInstrumentResult {
  id: InstrumentId;
  label: string;
  higherIsBetter: boolean;
  baseline: { total: number; date: string } | null;
  endpoint: { total: number; date: string } | null;
  /** endpoint.total - baseline.total (raw). Interpret direction via higherIsBetter. */
  change: number | null;
  improved: boolean | null;
  /** Reliable-change (MCID-based) classification of baseline -> endpoint, via the SAME
   *  classifyChange() function AssessmentScreen.tsx's deterioration nudge uses — not a duplicated
   *  calculation. Null when there's no baseline/endpoint pair, or the instrument has no established
   *  threshold. Closes the gap between the pilot protocol's stated intent (report a reliable-change
   *  band, not just a raw point estimate) and a bare delta number. */
  reliableChange: ChangeClassification | null;
}

export interface PilotSummary {
  enrolledDay: string;
  endpointDueDay: string;
  endpointReached: boolean;
  daysRemaining: number;
  instruments: PilotInstrumentResult[];
}

/** Pick the baseline + endpoint entry for one instrument, relative to the enrollment/endpoint days. */
function pick(entries: AssessmentEntry[], state: PilotState): { baseline: AssessmentEntry | null; endpoint: AssessmentEntry | null } {
  if (!entries.length) return { baseline: null, endpoint: null };
  // baseline: the assessment CLOSEST to the enrollment day (taken just before, at, or right after enrolling —
  // NOT a far-future endpoint entry). On an exact tie, prefer the one on/after enrollment.
  const target = Date.parse(`${state.enrolledDay}T00:00:00Z`);
  let baseline = entries[0];
  let bestDist = Infinity;
  for (const e of entries) {
    const dist = Math.abs(Date.parse(`${e.date}T00:00:00Z`) - target);
    if (dist < bestDist || (dist === bestDist && e.date >= state.enrolledDay)) {
      bestDist = dist;
      baseline = e;
    }
  }
  // endpoint: the latest assessment in the endpoint window AND strictly later than the baseline entry, so a
  // single assessment is never counted as both baseline and endpoint.
  const endpointCandidates = entries.filter((e) => e.date >= state.endpointDueDay && e.date > baseline.date);
  const endpoint = endpointCandidates.length ? endpointCandidates[endpointCandidates.length - 1] : null;
  return { baseline, endpoint };
}

/** Compute the on-device pre/post pilot summary, or null when not enrolled. */
export function computePilotSummary(now: Date = new Date()): PilotSummary | null {
  const state = getPilotState();
  if (!state?.enrolled) return null;
  const today = dayKey(now);
  const all = loadAssessments();

  const instruments = PILOT_INSTRUMENTS.map(({ id, label, higherIsBetter }) => {
    const { baseline, endpoint } = pick(assessmentsFor(id, all), state);
    const change = baseline && endpoint ? endpoint.total - baseline.total : null;
    const improved = change === null ? null : (higherIsBetter ? change > 0 : change < 0);
    const reliableChange = baseline && endpoint ? classifyChange(id, baseline.total, endpoint.total) : null;
    return {
      id, label, higherIsBetter,
      baseline: baseline ? { total: baseline.total, date: baseline.date } : null,
      endpoint: endpoint ? { total: endpoint.total, date: endpoint.date } : null,
      change, improved, reliableChange,
    };
  });

  const endpointReached = today >= state.endpointDueDay;
  const daysRemaining = endpointReached
    ? 0
    : Math.max(0, Math.round((Date.parse(`${state.endpointDueDay}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS));

  return { enrolledDay: state.enrolledDay, endpointDueDay: state.endpointDueDay, endpointReached, daysRemaining, instruments };
}

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
import { type ConnectionRecord } from "./humanConnection";
import type { SafetyPlan } from "../types";
import type { Medication, MedicationLog, DoseChange } from "./medicationAdherence";
import type { CheckInEntry } from "../types";
import type { CaregiverContact } from "./caregiverContacts";
import type { PeerSession } from "./peerSupport";
import type { RelapsePlan } from "./relapsePlan";

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

// ---- B11: what-didn't-help ------------------------------------------

export interface ClinicianWhatDidntHelpItem {
  source: "diary" | "insight";
  skill?: string;
  text?: string;
  date: string;
}

export interface ClinicianWhatDidntHelpForReport {
  items: ClinicianWhatDidntHelpItem[];
  totalCount: number;
}

/** PURE. Merge diary skills with timesNoHelp >= 1 and Nila insights of kind='what_didnt_help'.
 *  Sorted by recency (most recent first). Capped at 10 items. */
export function summarizeWhatDidntHelp(
  diarySkills: Array<{ skill: string; timesUsed: number; timesHelped: number; timesNoHelp: number }>,
  insights: Array<{ kind: string; text: string; date: string }>,
): ClinicianWhatDidntHelpForReport {
  const items: ClinicianWhatDidntHelpItem[] = [];

  for (const s of diarySkills) {
    if (s.timesNoHelp >= 1) {
      items.push({ source: "diary", skill: s.skill, date: "" });
    }
  }

  for (const ins of insights) {
    if (ins.kind === "what_didnt_help") {
      items.push({ source: "insight", text: ins.text, date: ins.date });
    }
  }

  // Sort by date descending, cap at 10.
  const sorted = items
    .sort((a, b) => (b.date > a.date ? 1 : -1))
    .slice(0, 10);

  return { items: sorted, totalCount: items.length };
}

// ---- B1: thought record summary ------------------------------------

export interface ClinicianThoughtRecordsForReport {
  count: number;
  topEmotions: Array<{ emotion: string; count: number }>;
  topSituations: Array<{ theme: string; count: number }>;
  /** The most-recent situation + emotion text (patient-authored; no LLM paraphrase). */
  excerpt: { situation: string; emotion: string } | null;
}

/** PURE. Reduce thought record entries to a clinician-friendly summary.
 *
 *  The clinician gets: how many records exist, what emotions are most frequent,
 *  what situation themes recur (keyword frequency — not an LLM classification),
 *  and one recent situation+emotion as an illustrative excerpt.
 *
 *  The automaticThought, evidenceFor, evidenceAgainst fields are intentionally NOT
 *  included — those are between the patient and their therapist's CBT process.
 *  Only situation + emotion go into the summary.
 *
 *  Privacy note: situation text is patient-authored free text. The clinician reads it
 *  as a self-report artifact. The patient chose to write it. This is the intended use.
 *
 *  @param records  Array of thought record entries from secureLocal (nilamind_thought_records).
 */
export function summarizeThoughtRecordsForReport(
  records: Array<{ situation: string; emotion: string; date?: string }>,
): ClinicianThoughtRecordsForReport {
  if (!records || records.length === 0) {
    return { count: 0, topEmotions: [], topSituations: [], excerpt: null };
  }

  // Emotion frequency.
  const emotionCounts: Record<string, number> = {};
  for (const r of records) {
    if (r.emotion) emotionCounts[r.emotion] = (emotionCounts[r.emotion] || 0) + 1;
  }
  const topEmotions = Object.entries(emotionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([emotion, count]) => ({ emotion, count }));

  // Situation theme: first word of each situation (most distinct, not the whole sentence).
  // Alternatively: most common short words. Simpler: first 2 words as a theme tag.
  const situationCounts: Record<string, number> = {};
  for (const r of records) {
    if (r.situation) {
      const words = r.situation.trim().split(/\s+/);
      const theme = words.slice(0, 2).join(" ");
      if (theme) situationCounts[theme] = (situationCounts[theme] || 0) + 1;
    }
  }
  const topSituations = Object.entries(situationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([theme, count]) => ({ theme, count }));

  // Excerpt: most recent record with situation + emotion.
  const sortedByDate = [...records]
    .filter((r) => r.situation && r.emotion)
    .sort((a, b) => ((b.date ?? "") > (a.date ?? "") ? 1 : -1));
  const excerpt = sortedByDate[0]
    ? { situation: sortedByDate[0].situation, emotion: sortedByDate[0].emotion }
    : null;

  return { count: records.length, topEmotions, topSituations, excerpt };
}

// ---- B2: safety plan state ------------------------------------------

const SAFETY_PLAN_STRING_FIELDS: (keyof SafetyPlan)[] = [
  "warningSigns",
  "internalCoping",
  "socialDistractors",
  "trustedPeople",
  "professionals",
  "safeEnvironment",
];

export interface ClinicianSafetyPlanForReport {
  hasAnySection: boolean;
  /** Only non-empty sections are included — {} when nothing is filled. */
  sectionCounts: Record<string, number>;
  lastUpdated: string | null;
}

/** PURE. Summarise the patient's Safety Plan as metadata for the clinician PDF.
 *
 *  The Stanley-Brown Safety Plan has named sections: warningSigns, copingStrategies,
 *  reasonsForLiving, personalStrengths, sourcesOfSupport, professionalContacts,
 *  meansRestriction. A clinician seeing the file benefits from knowing (a) how
 *  many sections the patient has filled, (b) which sections are empty (clinical signal),
 *  and (c) when the plan was last updated.
 *
 *  Privacy: the actual content of any section is NEVER exported. Only the count
 *  of entries per section is surfaced — that is not PHI, it is a structure metric.
 *
 *  @param plan  The parsed SafetyPlan from secureLocal (nilamind_safetyplan).
 */
export function summarizeSafetyPlanForReport(plan: SafetyPlan | null): ClinicianSafetyPlanForReport {
  if (!plan) return { hasAnySection: false, sectionCounts: {}, lastUpdated: null };

  const sectionCounts: Record<string, number> = {};
  let hasAny = false;

  for (const key of SAFETY_PLAN_STRING_FIELDS) {
    const val = plan[key];
    if (typeof val !== "string") continue;
    const entries = val.split("\n").filter((s: string) => s.trim());
    if (entries.length > 0) {
      sectionCounts[key] = entries.length;
      hasAny = true;
    }
  }

  const lastUpdated =
    plan.lastUpdatedAt && Number.isFinite(plan.lastUpdatedAt)
      ? new Date(plan.lastUpdatedAt).toISOString().slice(0, 10)
      : null;

  return { hasAnySection: hasAny, sectionCounts, lastUpdated };
}

// ---- B7: medication-mood correlation --------------------------------

export interface ClinicianMedCorrelationForReport {
  perMed: Array<{
    name: string;
    adherenceRate: number;
    avgMoodWhenTaken: number | null;
    avgMoodWhenMissed: number | null;
    daysInPeriod: number;
    daysTaken: number;
    daysMissed: number;
  }>;
  overallAdherence: number;
}

/** PURE. Cross-reference medication logs with mood check-ins to surface adherence patterns
 *  and mood differences on taken vs missed days.
 *
 *  Privacy: no log content, side-effect details, or check-in context leaves — only
 *  numeric aggregates (counts, averages, percentages).
 *
 *  @param logs     MedicationLog[] for the report period.
 *  @param checkins CheckInEntry[] for the report period.
 *  @param meds     Active Medication[] to iterate.
 */
export function summarizeMedCorrelation(
  logs: MedicationLog[],
  checkins: CheckInEntry[],
  meds: Medication[],
): ClinicianMedCorrelationForReport {
  if (meds.length === 0) return { perMed: [], overallAdherence: 0 };

  // Build a date→intensity map from checkins (one intensity per day, last wins).
  const moodByDate: Record<string, number> = {};
  for (const c of checkins) {
    if (typeof c.intensity === "number") moodByDate[c.date] = c.intensity;
  }

  let totalTaken = 0;
  let totalMissed = 0;

  const perMed = meds
    .filter((m) => m.active)
    .map((med) => {
      const medLogs = logs.filter((l) => l.medId === med.id);
      const taken = medLogs.filter((l) => l.taken);
      const missed = medLogs.filter((l) => !l.taken);
      const daysInPeriod = medLogs.length;
      const daysTaken = taken.length;
      const daysMissed = missed.length;
      const adherenceRate = daysInPeriod > 0 ? Math.round((daysTaken / daysInPeriod) * 100) : 0;

      totalTaken += daysTaken;
      totalMissed += daysMissed;

      const takenMoods = taken.map((l) => moodByDate[l.date]).filter((v) => typeof v === "number");
      const missedMoods = missed.map((l) => moodByDate[l.date]).filter((v) => typeof v === "number");

      const avgMoodWhenTaken = takenMoods.length > 0
        ? takenMoods.reduce((a, b) => a + b, 0) / takenMoods.length
        : null;
      const avgMoodWhenMissed = missedMoods.length > 0
        ? missedMoods.reduce((a, b) => a + b, 0) / missedMoods.length
        : null;

      return {
        name: med.name,
        adherenceRate,
        avgMoodWhenTaken: avgMoodWhenTaken !== null ? Math.round(avgMoodWhenTaken * 10) / 10 : null,
        avgMoodWhenMissed: avgMoodWhenMissed !== null ? Math.round(avgMoodWhenMissed * 10) / 10 : null,
        daysInPeriod,
        daysTaken,
        daysMissed,
      };
    });

  const overallAdherence = (totalTaken + totalMissed) > 0
    ? Math.round((totalTaken / (totalTaken + totalMissed)) * 100)
    : 0;

  return { perMed, overallAdherence };
}

// ---- B10: supports recap -------------------------------------------

export interface ClinicianSupportsRecapForReport {
  caregiverCount: number;
  relationships: string[];
  peerSessionCount: number;
  avgMoodImprovement: number | null;
  hasPeerData: boolean;
}

/** PURE. Summarise the patient's structured support network for the clinician PDF.
 *
 *  Surfaces caregiver contacts (count + relationship types) and peer support
 *  sessions (count + avg mood improvement). This complements B2 (safety plan
 *  structure), B8 (social connection frequency), and B12 (pact/trusted person).
 *
 *  Privacy: no names, phone numbers, or session notes are exported — only counts,
 *  relationship categories, and aggregate mood deltas.
 *
 *  @param caregivers  CaregiverContact[] from secureLocal.
 *  @param peerSessions PeerSession[] from secureLocal.
 */
export function summarizeSupportsRecap(
  caregivers: CaregiverContact[],
  peerSessions: PeerSession[],
): ClinicianSupportsRecapForReport {
  const caregiverCount = caregivers.length;
  const relationships = [...new Set(caregivers.map((c) => c.relationship).filter(Boolean))];

  const peerSessionCount = peerSessions.length;
  const improvements = peerSessions
    .filter((s) => typeof s.moodAfter === "number")
    .map((s) => (s.moodAfter as number) - s.moodBefore);
  const avgMoodImprovement = improvements.length > 0
    ? Math.round((improvements.reduce((a, b) => a + b, 0) / improvements.length) * 10) / 10
    : null;

  return {
    caregiverCount,
    relationships,
    peerSessionCount,
    avgMoodImprovement,
    hasPeerData: peerSessionCount > 0,
  };
}

// ---- G3: medication dose-change timeline --------------------------------

export interface ClinicianDoseChangeEntry {
  medName: string;
  oldDose: string;
  newDose: string;
  date: string;
}

export interface ClinicianDoseChangesForReport {
  hasData: boolean;
  changes: ClinicianDoseChangeEntry[];
}

/** PURE. Summarise dose-change history across all medications for the clinician PDF.
 *
 *  The clinician gets a dated timeline of dose changes — essential for med-review.
 *  Privacy: only medication name, old/new dose, and date — no patient-identifying info.
 *
 *  @param meds  Medication[] from secureLocal (all meds, including inactive — dose history matters).
 *  @param _now  Unused; reserved for consistency with other aggregators.
 */
export function summarizeDoseChanges(
  meds: Medication[],
  _now: Date = new Date(),
): ClinicianDoseChangesForReport {
  const allChanges: ClinicianDoseChangeEntry[] = [];

  for (const med of meds) {
    if (!med.doseChanges || med.doseChanges.length === 0) continue;
    for (const dc of med.doseChanges) {
      allChanges.push({
        medName: med.name,
        oldDose: dc.oldDose,
        newDose: dc.newDose,
        date: dc.date,
      });
    }
  }

  // Sort by date descending (most recent first), cap at 10.
  allChanges.sort((a, b) => b.date.localeCompare(a.date));
  const capped = allChanges.slice(0, 10);

  return { hasData: capped.length > 0, changes: capped };
}

// ---- G4: side-effect duration/resolution --------------------------------

export interface ClinicianSideEffectSummaryItem {
  symptom: string;
  occurrenceCount: number;
  avgSeverity: number;
}

export interface ClinicianResolvedSideEffectItem extends ClinicianSideEffectSummaryItem {
  avgDurationDays: number;
}

export interface ClinicianSideEffectDurationForReport {
  hasData: boolean;
  activeSideEffects: ClinicianSideEffectSummaryItem[];
  resolvedSideEffects: ClinicianResolvedSideEffectItem[];
}

/** PURE. Summarise side-effect duration and resolution across medication logs for the clinician PDF.
 *
 *  The clinician gets: which side effects are still active, which resolved and how long they lasted,
 *  and average severity. This helps evaluate side-effect burden driving adherence decisions.
 *  Privacy: only symptom names, counts, and severity — no log content or patient context.
 *
 *  @param logs  MedicationLog[] from secureLocal — pre-filtered by caller to the report window.
 */
export function summarizeSideEffectDuration(
  logs: MedicationLog[],
): ClinicianSideEffectDurationForReport {
  if (!logs || logs.length === 0) {
    return { hasData: false, activeSideEffects: [], resolvedSideEffects: [] };
  }

  // Collect all side-effect entries across logs.
  const allSE = logs.flatMap((l) => l.sideEffects);
  if (allSE.length === 0) {
    return { hasData: false, activeSideEffects: [], resolvedSideEffects: [] };
  }

  // Group by symptom.
  const bySymptom = new Map<string, { entries: typeof allSE }>();
  for (const se of allSE) {
    const bucket = bySymptom.get(se.symptom) ?? { entries: [] };
    bucket.entries.push(se);
    bySymptom.set(se.symptom, bucket);
  }

  const activeSideEffects: ClinicianSideEffectSummaryItem[] = [];
  const resolvedSideEffects: ClinicianResolvedSideEffectItem[] = [];

  for (const [symptom, { entries }] of bySymptom) {
    const avgSeverity = Math.round((entries.reduce((s, e) => s + e.severity, 0) / entries.length) * 10) / 10;
    const unresolved = entries.filter((e) => !e.resolvedAt);
    const resolved = entries.filter((e) => e.resolvedAt && e.loggedAt);

    if (unresolved.length > 0) {
      activeSideEffects.push({ symptom, occurrenceCount: unresolved.length, avgSeverity });
    }

    if (resolved.length > 0) {
      const durations = resolved.map((e) => {
        const start = new Date(e.loggedAt!).getTime();
        const end = new Date(e.resolvedAt!).getTime();
        return Math.round((end - start) / (1000 * 60 * 60 * 24));
      });
      const avgDurationDays = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
      resolvedSideEffects.push({ symptom, occurrenceCount: resolved.length, avgSeverity, avgDurationDays });
    }
  }

  return {
    hasData: activeSideEffects.length > 0 || resolvedSideEffects.length > 0,
    activeSideEffects,
    resolvedSideEffects,
  };
}

// ---- 20.7: WHO-5 wellbeing trajectory -----------------------------------

export interface ClinicianWho5ForReport {
  hasData: boolean;
  entries: Array<{ date: string; score: number; severity: string }>;
  trend: "improving" | "stable" | "worsening" | null;
  latestScore: number | null;
  /** WHO-5 threshold: ≤13 is "low wellbeing" per Topp 2015. */
  belowThresholdCount: number;
}

/** PURE. Summarise the WHO-5 wellbeing trajectory for the clinician PDF.
 *
 *  The WHO-5 is the world's most validated brief wellbeing measure. The trajectory
 *  directly supports relapse-prevention discussion. Per Topp 2015: scores ≤13 indicate
 *  "low wellbeing" and warrant clinical attention.
 *
 *  Privacy: only the scores and severity labels the patient entered — no content.
 *
 *  @param entries  AssessmentEntry[] filtered to WHO-5 by the caller.
 */
export function summarizeWho5ForReport(
  entries: Array<{ date: string; total: number; severity: string }>,
): ClinicianWho5ForReport {
  if (!entries || entries.length === 0) {
    return { hasData: false, entries: [], trend: null, latestScore: null, belowThresholdCount: 0 };
  }

  const mapped = entries.map((e) => ({ date: e.date, score: e.total, severity: e.severity }));
  const latestScore = mapped[mapped.length - 1].score;

  // Trend: compare first third avg to last third avg (robust to sparse data).
  let trend: "improving" | "stable" | "worsening" | null = null;
  if (mapped.length >= 3) {
    const third = Math.floor(mapped.length / 3);
    const firstThirdAvg = mapped.slice(0, third).reduce((s, e) => s + e.score, 0) / third;
    const lastThirdAvg = mapped.slice(-third).reduce((s, e) => s + e.score, 0) / third;
    const diff = lastThirdAvg - firstThirdAvg;
    if (diff > 5) trend = "improving";
    else if (diff < -5) trend = "worsening";
    else trend = "stable";
  }

  const belowThresholdCount = mapped.filter((e) => e.score <= 13).length;

  return { hasData: true, entries: mapped, trend, latestScore, belowThresholdCount };
}

// ---- G8: relapse plan summary -------------------------------------------

export interface ClinicianRelapsePlanForReport {
  hasData: boolean;
  greenSignalsCount: number;
  greenActionsCount: number;
  orangeSignalsCount: number;
  orangeActionsCount: number;
  redCrisisResources: number;
  lastUpdated: string | null;
  lastReviewed: string | null;
}

/** PURE. Summarise the patient's relapse prevention plan as metadata for the clinician PDF.
 *
 *  The clinician benefits from knowing (a) whether a plan exists, (b) which phases have
 *  signals and actions filled in, (c) when it was last updated/reviewed.
 *  Privacy: the actual content of signals and actions is NEVER exported — only counts.
 *
 *  @param plan  The RelapsePlan from secureLocal (or null).
 */
export function summarizeRelapsePlanForReport(
  plan: RelapsePlan | null,
): ClinicianRelapsePlanForReport {
  if (!plan) {
    return {
      hasData: false,
      greenSignalsCount: 0, greenActionsCount: 0,
      orangeSignalsCount: 0, orangeActionsCount: 0,
      redCrisisResources: 0,
      lastUpdated: null, lastReviewed: null,
    };
  }

  const countSignals = (signals: { thoughts: string; feelings: string; behaviors: string; physical: string }): number =>
    [signals.thoughts, signals.feelings, signals.behaviors, signals.physical]
      .filter((v) => v.trim().length > 0).length;

  const greenSignalsCount = countSignals(plan.green.signals);
  const greenActionsCount =
    plan.green.actions.selfCare.length +
    plan.green.actions.copingSkills.length +
    plan.green.actions.reachOut.length;

  const orangeSignalsCount = countSignals(plan.orange.signals);
  const orangeActionsCount =
    plan.orange.actions.selfCare.length +
    plan.orange.actions.copingSkills.length +
    plan.orange.actions.reachOut.length;

  const redCrisisResources = plan.red.crisisLines.length + plan.red.emergencyContacts.length;

  const lastUpdated = plan.updatedAt ? plan.updatedAt.slice(0, 10) : null;
  const lastReviewed = plan.lastReviewedAt ? plan.lastReviewedAt.slice(0, 10) : null;

  return {
    hasData: true,
    greenSignalsCount,
    greenActionsCount,
    orangeSignalsCount,
    orangeActionsCount,
    redCrisisResources,
    lastUpdated,
    lastReviewed,
  };
}

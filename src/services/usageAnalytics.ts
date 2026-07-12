import { secureLocal } from "./secureLocal";
import type { CheckInEntry } from "../types";

const CHECKINS_KEY = "nilamind_checkins";

function readArr<T>(key: string): T[] {
  try {
    const raw = secureLocal.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function checkinFrequency(checkins: CheckInEntry[]): number {
  if (checkins.length < 2) return checkins.length > 0 ? 1 : 0;
  const dates = [...new Set(checkins.map((c) => c.date))].sort();
  const span = (Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 86400000;
  return span > 0 ? dates.length / span : dates.length;
}

export function averageMoodIntensity(checkins: CheckInEntry[]): number | null {
  const vals = checkins.map((c) => c.intensity).filter((n): n is number => typeof n === "number" && n > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export function topEmotion(checkins: CheckInEntry[]): string | null {
  if (!checkins.length) return null;
  const freq = new Map<string, number>();
  for (const c of checkins) {
    if (c.emotion) freq.set(c.emotion, (freq.get(c.emotion) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [emotion, count] of freq) {
    if (count > bestCount) {
      bestCount = count;
      best = emotion;
    }
  }
  return best;
}

export interface MoodSleepCorr {
  highSleepMood: number;
  lowSleepMood: number;
}

export function moodSleepCorrelation(checkins: CheckInEntry[]): MoodSleepCorr | null {
  const withSleep = checkins.filter((c) => typeof c.sleepHours === "number");
  if (!withSleep.length) return null;
  const high = withSleep.filter((c) => c.sleepHours! >= 7).map((c) => c.intensity).filter(Boolean);
  const low = withSleep.filter((c) => c.sleepHours! < 7).map((c) => c.intensity).filter(Boolean);
  if (!high.length || !low.length) return null;
  return {
    highSleepMood: high.reduce((a, b) => a + b, 0) / high.length,
    lowSleepMood: low.reduce((a, b) => a + b, 0) / low.length,
  };
}

export interface SleepTrend {
  recentAvg: number;
  olderAvg: number;
}

export function sleepTrend(checkins: CheckInEntry[]): SleepTrend | null {
  const withSleep = checkins.filter((c) => typeof c.sleepHours === "number");
  if (withSleep.length < 4) return null;
  const sorted = [...withSleep].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-3).map((c) => c.sleepHours!);
  const older = sorted.slice(0, -3).map((c) => c.sleepHours!);
  return {
    recentAvg: recent.reduce((a, b) => a + b, 0) / recent.length,
    olderAvg: older.reduce((a, b) => a + b, 0) / older.length,
  };
}

export interface ProtocolStats {
  started: number;
  completed: number;
  rate: number;
}

export function protocolCompletions(): ProtocolStats {
  let started = 0;
  try {
    const raw = secureLocal.getItem("nilamind_protocol_progress");
    const parsed = raw ? JSON.parse(raw) : null;
    started = parsed?.protocolId ? 1 : 0;
  } catch {
    started = 0;
  }
  // 2026-07-12 QA (F14): this used to be a hardcoded `completed = 0` stub — finishing a program left no
  // trace anywhere the dashboard could read. protocolProgress.advanceProtocol() now appends a completion
  // record to this append-only log on every finish; read the real count here.
  let completed = 0;
  try {
    const raw = secureLocal.getItem("nilamind_protocol_completions");
    const parsed = raw ? JSON.parse(raw) : [];
    completed = Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    completed = 0;
  }
  const rate = started + completed > 0 ? completed / (started + completed) : 0;
  return { started, completed, rate };
}

export function featureAdoption(): string[] {
  const adopted: string[] = [];
  const checks: [string, string][] = [
    ["nilamind_thought_records", "thought_records"],
    ["nilamind_ba_activities", "ba_activities"],
    ["nilamind_values", "values_snapshot"],
    ["nilamind_compassionate_letters", "compassionate_letters"],
    ["nilamind_exposure_hierarchy", "exposure_hierarchy"],
    ["nilamind_episodes", "episode_records"],
    ["nilamind_assessments", "assessments"],
    ["nilamind_diary", "diary_cards"],
    // 2026-07-12 QA (F14): a completed guided program (protocolProgress.ts's completions log) is a real,
    // meaningful feature-use signal — it was missing from adoption tracking entirely.
    ["nilamind_protocol_completions", "guided_programs"],
  ];
  for (const [key, name] of checks) {
    try {
      const raw = secureLocal.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.steps) ? parsed.steps : parsed?.domains ? parsed.domains : null;
      if (arr && arr.length > 0) adopted.push(name);
    } catch {
    }
  }
  return adopted;
}

export interface AssessmentSummary {
  [instrument: string]: number;
}

interface AssessmentEntry {
  date: string; instrument?: string; score: number; id: string;
}

interface AssessmentTracker {
  score: number;
  date: string;
}

export function assessmentSummary(
  entries: AssessmentEntry[],
): AssessmentSummary {
  const latest: Record<string, AssessmentTracker> = {};
  for (const e of entries) {
    if (!e.instrument) continue;
    const prev = latest[e.instrument];
    if (!prev || e.date > prev.date) {
      latest[e.instrument] = { score: e.score, date: e.date };
    }
  }
  const out: AssessmentSummary = {};
  for (const [k, v] of Object.entries(latest)) out[k] = v.score;
  return out;
}

// 2026-07-12: self-retention / consistency tracking. A true cross-user "Day-30 retention
// cohort" would need server aggregation, which this app's privacy promise forbids — so we
// measure the one user's OWN engagement on-device: active days, current (forgiving) streak,
// and Day-7/Day-30 still-active flags. This is the honest, privacy-safe form of the
// "does the app actually keep people" question. Idempotent per UTC day.
const ACTIVE_DAYS_KEY = "nilamind_active_days";

function isoDay(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().split("T")[0]!;
}

export function recordActiveDay(day?: Date | string): void {
  const key = isoDay(day ?? new Date());
  const set = readArr<string>(ACTIVE_DAYS_KEY);
  if (!set.includes(key)) {
    set.push(key);
    try {
      secureLocal.setItem(ACTIVE_DAYS_KEY, JSON.stringify(set));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }
}

function activeDaySet(): Set<string> {
  return new Set(readArr<string>(ACTIVE_DAYS_KEY));
}

export interface RetentionSnapshot {
  firstActiveIso: string | null;
  totalActiveDays: number;
  /** Consecutive active days ending at the most-recent active day (forgiving — a single quiet day doesn't zero it). */
  currentStreak: number;
  /** Active on day 7 after the first active day (the classic early-retention signal). */
  day7Active: boolean;
  /** Active on day 30 after the first active day (the hard retention cliff). */
  day30Active: boolean;
}

export function retentionSnapshot(now: Date | string = new Date()): RetentionSnapshot {
  const set = activeDaySet();
  const days = [...set].sort();
  if (!days.length) {
    return { firstActiveIso: null, totalActiveDays: 0, currentStreak: 0, day7Active: false, day30Active: false };
  }
  const first = days[0]!;
  const firstDt = new Date(first + "T00:00:00Z");
  const dayAt = (offset: number): string => {
    const d = new Date(firstDt);
    d.setUTCDate(d.getUTCDate() + offset);
    return isoDay(d);
  };
  const today = isoDay(now);
  const last = days[days.length - 1]!;
  const lastDt = new Date(last + "T00:00:00Z");
  const todayDt = new Date(today + "T00:00:00Z");
  // Only a "current" streak if the most-recent active day is today or yesterday.
  const gapDays = Math.round((todayDt.getTime() - lastDt.getTime()) / 86400000);
  let streak = 0;
  if (gapDays <= 1) {
    let cur = new Date(lastDt);
    while (set.has(isoDay(cur))) {
      streak += 1;
      cur.setUTCDate(cur.getUTCDate() - 1);
    }
  }
  return {
    firstActiveIso: first,
    totalActiveDays: days.length,
    currentStreak: streak,
    day7Active: set.has(dayAt(7)),
    day30Active: set.has(dayAt(30)),
  };
}

export interface UsageSummary {
  totalCheckins: number;
  checkinFrequency: number;
  avgMood: number | null;
  topEmotion: string | null;
  moodSleepCorrelation: MoodSleepCorr | null;
  sleepTrend: SleepTrend | null;
  features: string[];
  protocols: ProtocolStats;
  assessments: AssessmentSummary;
}

export function computeUsageSummary(): UsageSummary {
  const checkins = readArr<CheckInEntry>(CHECKINS_KEY);
  const assessments = readArr<{ date: string; instrument?: string; score: number; id: string }>("nilamind_assessments");
  return {
    totalCheckins: checkins.length,
    checkinFrequency: checkinFrequency(checkins),
    avgMood: averageMoodIntensity(checkins),
    topEmotion: topEmotion(checkins),
    moodSleepCorrelation: moodSleepCorrelation(checkins),
    sleepTrend: sleepTrend(checkins),
    features: featureAdoption(),
    protocols: protocolCompletions(),
    assessments: assessmentSummary(assessments),
  };
}

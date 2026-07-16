// Pure analytics for the merged Dashboard (absorbs InsightsScreen). No network, no secureLocal,
// no React — every function takes data as arguments so it is unit-testable in the node env.
import type { CheckInEntry, DiaryCardEntry, EpisodeRecord } from "../types";
import type { MoodPoint } from "./patternInsights";

export interface EmotionBar {
  name: string;
  value: number;
}

/**
 * Count check-ins by BASE emotion (provenance suffix stripped via the injected `strip` fn) so that
 * "Anxious (Nila)", "Anxious (One-Tap)" and bare "Anxious" all collapse into one bar. Case is
 * preserved (strip does not lowercase). Sorted by count descending.
 */
export function emotionDistribution(
  checkins: CheckInEntry[],
  strip: (e: string) => string
): EmotionBar[] {
  const counts: Record<string, number> = {};
  for (const c of checkins) {
    const name = strip(c.emotion || "").trim();
    if (!name) continue;
    counts[name] = (counts[name] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Plain-text observations computed from the user's own logs (ported from InsightsScreen
 * getDerivedInsights). Every string is a transparent local computation — NO fabricated/static
 * correlations (those are deleted in the merge). Returns [] when there is nothing to say.
 */
export function derivedObservations(
  checkins: CheckInEntry[],
  diaryEntries: DiaryCardEntry[]
): string[] {
  const insights: string[] = [];
  if (checkins.length === 0) return insights;

  // Highest-average-distress day of week
  const dayScores: Record<string, { total: number; count: number }> = {};
  for (const c of checkins) {
    try {
      // #17 (audit): parse the stored "YYYY-MM-DD" as LOCAL midnight (matching patternInsights/assessments),
      // not bare new Date(c.date) which parses as UTC midnight and renders the previous weekday west of UTC.
      const day = new Date(c.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });
      (dayScores[day] ||= { total: 0, count: 0 });
      dayScores[day].total += c.intensity;
      dayScores[day].count += 1;
    } catch {
      /* ignore unparseable date */
    }
  }
  // Gate + soften the "worst weekday" callout: negative-emphasis framing risks disengagement, per
  // Polhemus, Novak, Áine Ryan et al. (2022), JMIR Mental Health, so this should only surface on a
  // real signal, stated gently — not a definitive-sounding read of one lucky/unlucky day. The
  // specific thresholds below (min total logs, min samples in the leading day's own bucket) are a
  // design safeguard, not numbers drawn from that citation: a day built from a single data point
  // is statistical noise dressed up as a pattern, regardless of how the framing is worded.
  const MIN_TOTAL_CHECKINS_FOR_WEEKDAY_CALLOUT = 5;
  const MIN_SAMPLES_IN_LEADING_DAY = 2;
  let worstDay = "";
  let highestAvg = 0;
  if (checkins.length >= MIN_TOTAL_CHECKINS_FOR_WEEKDAY_CALLOUT) {
    for (const [day, m] of Object.entries(dayScores)) {
      if (m.count < MIN_SAMPLES_IN_LEADING_DAY) continue;
      const a = m.total / m.count;
      if (a > highestAvg) {
        highestAvg = a;
        worstDay = day;
      }
    }
  }
  if (worstDay) {
    insights.push(`${worstDay}s have tended to show up with more distress in what you've logged so far — worth noticing, not a fixed pattern.`);
  }

  // Most-used grounding skill from diary cards
  const skillCounts: Record<string, number> = {};
  for (const d of diaryEntries) {
    for (const s of d.skillsUsed || []) skillCounts[s] = (skillCounts[s] || 0) + 1;
  }
  let bestSkill = "";
  let maxSkill = 0;
  for (const [skill, n] of Object.entries(skillCounts)) {
    if (n > maxSkill) {
      maxSkill = n;
      bestSkill = skill;
    }
  }
  if (bestSkill) {
    insights.push(`Your most deployed grounding skill is '${bestSkill}' (logged ${maxSkill} times recently).`);
  }

  // Joy↔misery observation from diary cards (real computation over the user's own entries)
  let joyDays = 0;
  let miseryWhenJoyHigh = 0;
  for (const d of diaryEntries) {
    if (d.emotions.joy >= 3) {
      joyDays += 1;
      miseryWhenJoyHigh += d.emotions.misery;
    }
  }
  if (joyDays > 0) {
    const avgMisery = miseryWhenJoyHigh / joyDays;
    if (avgMisery < 2) {
      insights.push(`On days when you logged Joy ≥ 3, your average Misery peak was low (${avgMisery.toFixed(1)}/5).`);
    }
  }

  return insights;
}

export interface EpisodePatterns {
  mostCommonTime: string;
  avgDuration: number;
  avgDrop: string;
  totalCount: number;
}

/** Episode analytics from EpisodeRecord[] (ported verbatim from InsightsScreen getEpisodePatterns). */
export function episodePatterns(episodes: EpisodeRecord[]): EpisodePatterns | null {
  if (episodes.length === 0) return null;

  const times: Record<string, number> = {};
  for (const e of episodes) times[e.timeOfDay] = (times[e.timeOfDay] || 0) + 1;
  let mostCommonTime = "";
  let maxTime = 0;
  for (const [time, count] of Object.entries(times)) {
    if (count > maxTime && time !== "undefined") {
      maxTime = count;
      mostCommonTime = time;
    }
  }

  const avgDuration = Math.round(
    episodes.reduce((acc, e) => acc + (e.durationMinutes || 0), 0) / episodes.length
  );

  const totalDrop = episodes.reduce((acc, e) => {
    const delta = e.startIntensity - e.endIntensity;
    return acc + (delta > 0 ? delta : 0);
  }, 0);
  const avgDrop = (totalDrop / episodes.length).toFixed(1);

  return { mostCommonTime, avgDuration, avgDrop, totalCount: episodes.length };
}

/** Top-10 quick-note tags (lowercased, trimmed, counted), descending. Tolerates missing tags. */
export function quickNoteTags(diaryEntries: DiaryCardEntry[]): [string, number][] {
  const counts: Record<string, number> = {};
  for (const d of diaryEntries) {
    for (const tag of d.quickNoteTags || []) {
      const cleaned = tag.toLowerCase().trim();
      if (!cleaned) continue;
      counts[cleaned] = (counts[cleaned] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) as [string, number][];
}

// ── ONE trend chart, fed by loadMoodHistory() (per-day averaged) ──────────────────────────────
export interface TrendPoint {
  date: string; // mm-dd
  intensity: number | null;
}
export interface ContextPoint {
  date: string; // mm-dd
  sleepHours: number;
  social: number;
}

const rangeLimit = (range: "7d" | "30d") => (range === "7d" ? 7 : 30);
const sortedTail = (mood: MoodPoint[], range: "7d" | "30d"): MoodPoint[] =>
  [...mood].sort((a, b) => a.date.localeCompare(b.date)).slice(-rangeLimit(range));

/** Emotion-tab series: per-day averaged intensity from loadMoodHistory(). Null days kept as null. */
export function moodTrend(mood: MoodPoint[], range: "7d" | "30d"): TrendPoint[] {
  return sortedTail(mood, range).map((m) => ({
    date: m.date.slice(5),
    intensity: m.intensity ?? null,
  }));
}

export interface TrendPointWithEma extends TrendPoint {
  emaIntensity?: number;
}

/**
 * Attaches EMA micro-check-in intensity onto the (already-sorted) trend array by date, instead of
 * handing the chart a second, separately-ordered array. loadEmaEntries() returns newest-first;
 * merging by value here — rather than letting Recharts reconcile two differently-ordered `data`
 * arrays across a Line and a Scatter series — keeps the chart's category axis chronological.
 */
export function mergeEmaIntoTrend(
  trend: TrendPoint[],
  emaEntries: { date: string; valence: number }[],
): TrendPointWithEma[] {
  const byDate = new Map<string, number>();
  for (const e of emaEntries) {
    byDate.set(e.date.slice(5), Math.round(((e.valence + 3) / 6) * 9) + 1); // map -3..+3 to 1..10 roughly
  }
  return trend.map((p) => {
    const emaIntensity = byDate.get(p.date);
    return emaIntensity === undefined ? p : { ...p, emaIntensity };
  });
}

export interface WeeklyBar {
  day: string; // "Monday" … "Sunday"
  avg: number; // average intensity
  count: number;
}

/** Per-day-of-week mood averages from check-ins. Used by the weekly rhythm bar chart. */
export function weeklyRhythmBars(checkins: CheckInEntry[]): WeeklyBar[] {
  const dayScores: Record<string, { total: number; count: number }> = {};
  for (const c of checkins) {
    try {
      const day = new Date(c.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });
      (dayScores[day] ||= { total: 0, count: 0 });
      dayScores[day].total += c.intensity;
      dayScores[day].count += 1;
    } catch { /* skip unparseable */ }
  }
  const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return order
    .map((day) => {
      const s = dayScores[day];
      return s ? { day, avg: Math.round((s.total / s.count) * 10) / 10, count: s.count } : { day, avg: 0, count: 0 };
    })
    .filter((b) => b.count > 0);
}

/** Context-tab series: sleep hours + felt-connection, 0-fallback for missing days. */
export function contextTrend(mood: MoodPoint[], range: "7d" | "30d"): ContextPoint[] {
  return sortedTail(mood, range).map((m) => ({
    date: m.date.slice(5),
    sleepHours: m.sleepHours ?? 0,
    social: m.social ?? 0,
  }));
}

export interface SleepMoodPoint {
  date: string;
  sleepHours: number;
  intensity: number | null;
}

/** Sleep-Mood tab series: sleep hours + mood intensity per day. Null days left as null. */
export function sleepMoodTrend(mood: MoodPoint[], range: "7d" | "30d"): SleepMoodPoint[] {
  return sortedTail(mood, range).map((m) => ({
    date: m.date.slice(5),
    sleepHours: m.sleepHours ?? 0,
    intensity: m.intensity ?? null,
  }));
}

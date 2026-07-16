// Diary card -> clinician report aggregation. Pure, deterministic, on-device: reduces a window
// of DiaryCardEntry rows into the compact trend/peak view a psychiatrist can scan in under a
// minute, plus a short "notable days" appendix for the specific dates that matter for chain
// analysis (an acted-on urge, or a high-misery day) rather than a raw 30-row dump.
import type { DiaryCardEntry } from "../types";

export interface DiaryUrgeSummary {
  key: string;
  label: string;
  avgIntensity: number;
  peakIntensity: number;
  daysActedOn: number;
}

export interface DiarySkillSummary {
  skill: string;
  timesUsed: number;
  timesHelped: number;
  timesNoHelp: number;
}

export interface DiaryNotableDay {
  date: string;
  reason: string;
}

export interface DiaryCardClinicianSummary {
  daysLogged: number;
  periodDays: number;
  urges: DiaryUrgeSummary[];
  emotionAverages: Record<string, number>;
  emotionPeaks: Record<string, number>;
  skills: DiarySkillSummary[];
  avgMisery: number | null;
  notableDays: DiaryNotableDay[];
}

const NOTABLE_MISERY_THRESHOLD = 4;

export function summarizeDiaryForClinician(
  entries: DiaryCardEntry[],
  cutoff: string,
  periodDays: number,
): DiaryCardClinicianSummary {
  const inWindow = entries.filter((e) => e.date >= cutoff);

  const urgeStats: Record<string, { label: string; sum: number; n: number; peak: number; actedOn: number }> = {};
  const emotionSums: Record<string, number> = {};
  const emotionPeaks: Record<string, number> = {};
  const emotionN: Record<string, number> = {};
  const skillStats: Record<string, DiarySkillSummary> = {};
  const notableDays: DiaryNotableDay[] = [];
  let miserySum = 0;
  let miseryN = 0;

  for (const e of inWindow) {
    let dayNotable: string | null = null;

    for (const [emotion, value] of Object.entries(e.emotions)) {
      emotionSums[emotion] = (emotionSums[emotion] ?? 0) + value;
      emotionN[emotion] = (emotionN[emotion] ?? 0) + 1;
      emotionPeaks[emotion] = Math.max(emotionPeaks[emotion] ?? 0, value);
    }
    miserySum += e.emotions.misery;
    miseryN += 1;
    if (e.emotions.misery >= NOTABLE_MISERY_THRESHOLD) {
      dayNotable = `misery ${e.emotions.misery}/5`;
    }

    for (const urge of e.urges ?? []) {
      const s = (urgeStats[urge.key] ??= { label: urge.label, sum: 0, n: 0, peak: 0, actedOn: 0 });
      s.sum += urge.intensity;
      s.n += 1;
      s.peak = Math.max(s.peak, urge.intensity);
      if (urge.actedOn) {
        s.actedOn += 1;
        dayNotable = `${urge.label.toLowerCase()} acted on`;
      }
    }

    for (const skill of e.skillsUsed) {
      const s = (skillStats[skill] ??= { skill, timesUsed: 0, timesHelped: 0, timesNoHelp: 0 });
      s.timesUsed += 1;
      const eff = e.skillEffectiveness?.[skill];
      if (eff === "tried_helped") s.timesHelped += 1;
      else if (eff === "tried_no_help") s.timesNoHelp += 1;
    }

    if (dayNotable) notableDays.push({ date: e.date, reason: dayNotable });
  }

  const emotionAverages: Record<string, number> = {};
  for (const emotion of Object.keys(emotionSums)) {
    emotionAverages[emotion] = emotionSums[emotion] / emotionN[emotion];
  }

  const urges: DiaryUrgeSummary[] = Object.entries(urgeStats).map(([key, s]) => ({
    key,
    label: s.label,
    avgIntensity: s.sum / s.n,
    peakIntensity: s.peak,
    daysActedOn: s.actedOn,
  }));

  return {
    daysLogged: inWindow.length,
    periodDays,
    urges,
    emotionAverages,
    emotionPeaks,
    skills: Object.values(skillStats),
    avgMisery: miseryN > 0 ? miserySum / miseryN : null,
    notableDays,
  };
}

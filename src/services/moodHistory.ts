import { secureLocal } from "./secureLocal";
// Adapter: reads the app's EXISTING mood + lifestyle data (localStorage) and shapes it into
// MoodPoint[] for the PatternInsightEngine — so correlations run on real logs, not synthetic.
// Read-only; touches nothing the rest of the app writes.

import type { MoodPoint } from './patternInsights';

interface DayAgg {
  intensitySum: number;
  intensityN: number;
  shame: number | null;
  sleepSum: number;
  sleepN: number;
  socialSum: number;
  socialN: number;
}

function blank(): DayAgg {
  return { intensitySum: 0, intensityN: 0, shame: null, sleepSum: 0, sleepN: 0, socialSum: 0, socialN: 0 };
}

/** Build one MoodPoint per date from check-ins (intensity, sleep hrs, social) + diary cards (shame). */
export function loadMoodHistory(): MoodPoint[] {
  const byDate: Record<string, DayAgg> = {};
  const get = (date: string): DayAgg => (byDate[date] ||= blank());

  // Check-ins: nilamind_checkins = CheckInEntry[]  ({ date, intensity, sleepHours?, socialInteraction? })
  try {
    const raw = secureLocal.getItem('nilamind_checkins');
    if (raw) {
      const list = JSON.parse(raw) as Array<{ date?: string; intensity?: number; sleepHours?: number; socialInteraction?: number }>;
      for (const c of list) {
        if (!c?.date) continue;
        const d = get(c.date);
        if (typeof c.intensity === 'number') { d.intensitySum += c.intensity; d.intensityN += 1; }
        if (typeof c.sleepHours === 'number') { d.sleepSum += c.sleepHours; d.sleepN += 1; }
        if (typeof c.socialInteraction === 'number') { d.socialSum += c.socialInteraction; d.socialN += 1; }
      }
    }
  } catch {
    /* ignore malformed */
  }

  // Diary: nilamind_diary = { [date]: { emotions: { shame: 0-5, ... } } }
  try {
    const raw = secureLocal.getItem('nilamind_diary');
    if (raw) {
      const map = JSON.parse(raw) as Record<string, { emotions?: { shame?: number } }>;
      for (const [date, entry] of Object.entries(map)) {
        const sh = entry?.emotions?.shame;
        if (typeof sh === 'number') get(date).shame = sh;
      }
    }
  } catch {
    /* ignore malformed */
  }

  return Object.entries(byDate).map(([date, d]) => ({
    date,
    intensity: d.intensityN ? Math.round((d.intensitySum / d.intensityN) * 10) / 10 : null,
    shame: d.shame,
    sleepHours: d.sleepN ? Math.round((d.sleepSum / d.sleepN) * 10) / 10 : null,
    social: d.socialN ? Math.round((d.socialSum / d.socialN) * 10) / 10 : null,
  }));
}

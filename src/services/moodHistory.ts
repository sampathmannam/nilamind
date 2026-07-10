import { secureLocal } from "./secureLocal";
// Adapter: reads the app's EXISTING mood + lifestyle data (localStorage) and shapes it into
// MoodPoint[] for the PatternInsightEngine — so correlations run on real logs, not synthetic.
// Read-only; touches nothing the rest of the app writes.

import { ls } from "./storageUtils";
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

/** Map EMA valence (-3 to +3) to distress intensity (1-10). Inverse: higher valence = lower distress. */
function valenceToIntensity(valence: number): number {
  return Math.max(1, Math.min(10, 5.5 - valence * 1.5));
}

const EMA_WEIGHT = 0.33; // Each EMA micro-check-in counts as 1/3 of a full check-in.

/** Build one MoodPoint per date from check-ins (intensity, sleep hrs, social) + diary cards (shame)
 *  + EMA micro-check-ins (valence → intensity, weighted lower). */
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

  // EMA micro-check-ins: nilamind_ema = EmaEntry[] ({ date, valence, energy? }). Weighted lower.
  try {
    const store = ls();
    if (store) {
      const raw = store.getItem('nilamind_ema');
      if (raw) {
        const list = JSON.parse(raw) as Array<{ date?: string; valence?: number }>;
        for (const e of list) {
          if (!e?.date || typeof e.valence !== 'number') continue;
          const d = get(e.date);
          d.intensitySum += valenceToIntensity(e.valence) * EMA_WEIGHT;
          d.intensityN += EMA_WEIGHT;
        }
      }
    }
  } catch {
    /* ignore malformed */
  }

  // #18 (audit): sort chronologically. byDate is built check-ins-first then diary-dates appended, so its
  // insertion order is NOT chronological — a diary-only past date lands last. Callers (nilaContext lastCheckin,
  // jitaiEngine slice(-5)/slice(-10,-5)) treat the tail as "most recent", so unsorted output caused a false
  // "haven't heard from you" nudge and scrambled deterioration windows. Date strings sort lexicographically.
  return Object.entries(byDate).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([date, d]) => ({
    date,
    intensity: d.intensityN ? Math.round((d.intensitySum / d.intensityN) * 10) / 10 : null,
    shame: d.shame,
    sleepHours: d.sleepN ? Math.round((d.sleepSum / d.sleepN) * 10) / 10 : null,
    social: d.socialN ? Math.round((d.socialSum / d.socialN) * 10) / 10 : null,
  }));
}

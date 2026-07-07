// Circadian rhythm tracking — on-device, privacy-first.
// Sleep regularity is a well-validated predictor of mood stability in bipolar spectrum conditions
// (e.g., the Sleep Regularity Index literature; Phillips et al., 2017). We compute a simple regularity
// score from the user's self-reported sleep hours (check-in "sleep last night" slider) and surface it
// as an early-warning signal — never a diagnosis. All computation is local; no data leaves the device.

import { loadMoodHistory } from "./moodHistory";

export interface CircadianInsight {
  nights: number;
  avgSleep: number;
  stdSleep: number;
  regularityScore: number; // 0–100, higher = more regular
  irregular: boolean; // true when variability is clinically notable
  direction: "improving" | "worsening" | "stable" | null;
  note: string;
}

/** Standard deviation of an array (population). */
function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

/** Map a sleep-hours standard deviation to a 0–100 regularity score.
 *  CV (std/mean) of ~0 → 100; CV ≥ 0.5 (very irregular) → ~0. */
export function regularityFromStd(mean: number, sd: number): number {
  if (mean <= 0) return 0;
  const cv = sd / mean;
  const score = Math.max(0, Math.min(100, 100 - (cv / 0.5) * 100));
  return Math.round(score);
}

export function computeCircadianInsight(mood: ReturnType<typeof loadMoodHistory> = loadMoodHistory()): CircadianInsight | null {
  const dated = mood
    .filter((m) => typeof m.sleepHours === "number" && m.sleepHours > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({ date: m.date, sleep: m.sleepHours as number }));

  if (dated.length < 3) return null;

  const sleeps = dated.map((d) => d.sleep);
  const mean = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
  const sd = std(sleeps);
  const score = regularityFromStd(mean, sd);
  const irregular = sd >= 1.5; // >=1.5h night-to-night swing is notable

  // Direction: compare first half vs second half average
  const half = Math.floor(sleeps.length / 2);
  const first = sleeps.slice(0, half);
  const second = sleeps.slice(half);
  const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
  const secondAvg = second.reduce((a, b) => a + b, 0) / second.length;
  const delta = secondAvg - firstAvg;
  let direction: CircadianInsight["direction"] = "stable";
  if (Math.abs(delta) < 0.4) direction = "stable";
  else if (delta > 0) direction = "improving";
  else direction = "worsening";

  let note: string;
  if (irregular) {
    note = "Your sleep timing has been swinging a lot night to night. Steadier sleep is one of the strongest buffers against mood shifts — anchoring a wake-up time can help.";
  } else if (direction === "worsening") {
    note = "Your sleep has been getting a little shorter lately. Worth a gentle look at the wind-down routine.";
  } else if (direction === "improving") {
    note = "Your sleep has been trending steadier. That's a quiet win for mood stability.";
  } else {
    note = "Your sleep has been fairly consistent. Keeping a regular wake time protects that.";
  }

  return {
    nights: dated.length,
    avgSleep: Math.round(mean * 10) / 10,
    stdSleep: Math.round(sd * 10) / 10,
    regularityScore: score,
    irregular,
    direction,
    note,
  };
}

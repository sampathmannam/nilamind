import { secureLocal } from "./secureLocal";
import { computeCompassionateStreak } from "./streaks";
import { getActiveProgress } from "./protocolProgress";
import { selfReportSleepSignal } from "./sleepInsight";
import { napDisruptionSignal } from "./napTracking";
import { ls } from "./storageUtils";

export interface WeeklyFacts {
  checkinCount: number;
  distinctEmotions: string[];
  topEmotion: string | null;
  avgIntensity: number | null;
  skillsUsed: string[];
  streak: number;
  activeProtocol: string | null;
  sleepFiring: boolean;
  napNote: string | null;
  episodes: number;
  lastSynthesisDay: number | null;
}

const SYNTHESIS_KEY = "nilamind_weekly_synthesis";

function cleanEmotion(label: unknown): string {
  return String(label ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
}

export function lastSynthesisTimestamp(): number | null {
  try {
    const raw = secureLocal.getItem(SYNTHESIS_KEY);
    if (!raw) return null;
    return JSON.parse(raw).at ?? null;
  } catch {
    return null;
  }
}

export function extractWeeklyFacts(): WeeklyFacts {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  since.setHours(0, 0, 0, 0);

  const checkins: any[] = (() => {
    try {
      const raw = secureLocal.getItem("nilamind_checkins");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })();

  const recent = checkins.filter((e: any) => {
    const d = new Date(e?.date);
    return !isNaN(d.getTime()) && d >= since;
  });

  const emotions = recent
    .map((e: any) => cleanEmotion(e?.emotion))
    .filter(Boolean);
  const tally = new Map<string, number>();
  for (const e of emotions) tally.set(e, (tally.get(e) || 0) + 1);
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);

  const intensities = recent
    .map((e: any) => Number(e.intensity))
    .filter((n) => !isNaN(n));
  const avg = intensities.length
    ? Math.round((intensities.reduce((a, n) => a + n, 0) / intensities.length) * 10) / 10
    : null;

  const diarySkills: string[] = (() => {
    try {
      const raw = secureLocal.getItem("nilamind_diary");
      const obj = raw ? JSON.parse(raw) : {};
      const entries: any[] = obj && typeof obj === "object" ? Object.values(obj) : [];
      return entries
        .filter((e: any) => { const d = new Date(e?.date); return !isNaN(d.getTime()) && d >= since; })
        .flatMap((e: any) => Array.isArray(e?.skillsUsed) ? e.skillsUsed : []);
    } catch { return []; }
  })();

  const epSkills: string[] = (() => {
    try {
      const raw = secureLocal.getItem("nilamind_episodes");
      const eps: any[] = raw ? JSON.parse(raw) : [];
      return eps
        .filter((e: any) => { const d = new Date(e?.date); return !isNaN(d.getTime()) && d >= since; })
        .flatMap((e: any) => Array.isArray(e?.skillsHelpful) ? e.skillsHelpful : []);
    } catch { return []; }
  })();

  const allSkills = [...diarySkills, ...epSkills];
  const skillTally = new Map<string, number>();
  for (const s of allSkills) skillTally.set(s, (skillTally.get(s) || 0) + 1);
  const topSkills = [...skillTally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const streak = computeCompassionateStreak()?.current ?? 0;
  const active = getActiveProgress();
  const sleep = selfReportSleepSignal();
  const nap = napDisruptionSignal();

  return {
    checkinCount: recent.length,
    distinctEmotions: sorted.map(([k]) => k),
    topEmotion: sorted[0]?.[0] ?? null,
    avgIntensity: avg,
    skillsUsed: topSkills,
    streak,
    activeProtocol: active?.protocol.title ?? null,
    sleepFiring: sleep?.firing ?? false,
    napNote: nap.firing ? nap.note : null,
    episodes: 0, // counted from nilamind_episodes in real version
    lastSynthesisDay: lastSynthesisTimestamp(),
  };
}

export function shouldRunSynthesis(): boolean {
  const last = lastSynthesisTimestamp();
  if (!last) return true;

  const sevenDaysMs = 7 * 86400_000;
  return Date.now() - last >= sevenDaysMs;
}

export function weeklySynthesisPrompt(facts: WeeklyFacts): string {
  const parts: string[] = [
    "Here is what happened this week. Reflect it back in 3-4 warm, plain sentences — the way a friend who remembers would. Never quote stats like a dashboard; weave them naturally. Never use exclamation marks. Never diagnose.",
  ];
  if (facts.checkinCount > 0) {
    parts.push(`They checked in ${facts.checkinCount} time${facts.checkinCount > 1 ? "s" : ""}.`);
  }
  if (facts.topEmotion) {
    parts.push(`Most often felt: ${facts.topEmotion}.`);
  }
  if (facts.avgIntensity !== null) {
    parts.push(`Average distress: ${facts.avgIntensity}/10.`);
  }
  if (facts.skillsUsed.length > 0) {
    parts.push(`Skills they used: ${facts.skillsUsed.join(", ")}.`);
  }
  if (facts.streak >= 2) {
    parts.push(`They've shown up ${facts.streak} days in a row.`);
  }
  if (facts.activeProtocol) {
    parts.push(`They're mid-way through: ${facts.activeProtocol}.`);
  }
  if (facts.sleepFiring) {
    parts.push(`Their sleep has been short — hold that gently, don't alarm.`);
  }
  if (facts.napNote) {
    parts.push(`Nap pattern: ${facts.napNote}`);
  }
  return parts.join(" ");
}

export function recordSynthesisTimestamp(): void {
  secureLocal.setItem(SYNTHESIS_KEY, JSON.stringify({ at: Date.now() }));
}

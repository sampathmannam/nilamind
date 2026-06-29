// Nila's memory — the "personalised AI with access to all your content" piece.
//
// PRIVACY (non-negotiable): every byte read here is the user's own data, encrypted at rest on THIS
// device. We assemble a short, human briefing from it ON-DEVICE and pass it to the local, on-device
// model only as prompt content for that one turn. Nothing leaves the device; nothing is logged.
// We deliberately summarise (counts, averages, top emotions) rather than forward raw entries — Nila
// should feel like a friend who *remembers how you've been*, not an app reading your diary back.
//
// Research basis: the working alliance — feeling known, understood, and held in mind — is the single
// most consistent predictor of benefit across therapies (Flückiger et al., 2018, Psychotherapy 55:316–340).
// Continuity ("you mentioned evenings are hard") is how a companion earns that alliance over time.

import { secureLocal } from "./secureLocal";
import { computeCompassionateStreak } from "./streaks";
import { recentMemoryLines } from "./nilaMemory";
import { insightsContextBlock } from "./nilaInsights";
import { profileContextBlock } from "./nilaProfile";
import { INSTRUMENTS } from "./assessments";

function readArray(key: string): any[] {
  try {
    const raw = secureLocal.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Strip logging suffixes like "anxious (Quick)" / "Anxious (Nila agent)" → "anxious". */
function cleanEmotion(label: unknown): string {
  return String(label ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

/** Human-friendly "today / yesterday / earlier this week" from a YYYY-MM-DD date string. */
function relativeDay(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "recently";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff <= 6) return "earlier this week";
  if (diff <= 14) return "last week";
  return "a little while back";
}

function topCounts(items: string[], n: number): string[] {
  const tally = new Map<string, number>();
  for (const it of items) {
    const k = it.trim();
    if (!k) continue;
    tally.set(k, (tally.get(k) || 0) + 1);
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

function joinNatural(items: string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

/**
 * Build a compact, warm briefing of what Nila knows about this person, from their on-device history.
 * Returns "" when there's essentially nothing yet — Nila is told (in its prompt) to simply be present
 * and not pretend to know someone it doesn't.
 */
export function buildPersonalContext(): string {
  const since14 = daysAgo(14);
  const lines: string[] = [];

  // ── Mood check-ins (last 2 weeks) ─────────────────────────────────────────
  const checkins = readArray("nilamind_checkins")
    .filter((e) => {
      const d = new Date(e?.date);
      return !isNaN(d.getTime()) && d >= since14;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (checkins.length) {
    const intensities = checkins.map((e) => Number(e.intensity)).filter((n) => !isNaN(n));
    const avg = intensities.length
      ? Math.round((intensities.reduce((a, n) => a + n, 0) / intensities.length) * 10) / 10
      : null;
    const emotions = topCounts(checkins.map((e) => cleanEmotion(e.emotion)).filter(Boolean), 3);
    const last = checkins[checkins.length - 1];
    const lastEmotion = cleanEmotion(last?.emotion);

    let l = `- The last couple of weeks: ${checkins.length} check-in${checkins.length > 1 ? "s" : ""}`;
    if (emotions.length) l += `, most often ${joinNatural(emotions)}`;
    if (avg !== null) l += `, distress averaging about ${avg}/10`;
    l += ".";
    lines.push(l);
    if (lastEmotion) lines.push(`- Their most recent check-in: "${lastEmotion}", ${relativeDay(last.date)}.`);
  }

  // ── What has helped (episodes + diary) ────────────────────────────────────
  const helpedFromEpisodes = readArray("nilamind_episodes").flatMap((e) =>
    Array.isArray(e?.skillsHelpful) ? e.skillsHelpful.map((s: unknown) => String(s)) : []
  );
  const helpedFromDiary = readArray("nilamind_diary").flatMap((e) =>
    Array.isArray(e?.skillsUsed) ? e.skillsUsed.map((s: unknown) => String(s)) : []
  );
  const helped = topCounts([...helpedFromEpisodes, ...helpedFromDiary], 3);
  if (helped.length) lines.push(`- What's tended to help them before: ${joinNatural(helped)}.`);

  // ── Recent hard moments (episodes) ────────────────────────────────────────
  const episodes = readArray("nilamind_episodes").filter((e) => {
    const d = new Date(e?.date);
    return !isNaN(d.getTime()) && d >= since14;
  });
  if (episodes.length) {
    const whenThemes = topCounts(episodes.map((e) => String(e?.timeOfDay || "").trim()).filter(Boolean), 1);
    const whenStr = whenThemes.length ? `, often in the ${whenThemes[0].toLowerCase()}` : "";
    lines.push(`- A few hard moments lately (${episodes.length})${whenStr} — they got through them.`);
  }

  // ── Showing up (streak) ───────────────────────────────────────────────────
  try {
    const streak = computeCompassionateStreak();
    if (streak?.current && streak.current >= 2) {
      lines.push(`- They've checked in ${streak.current} days running — they keep showing up for themselves.`);
    }
  } catch {
    /* streak is best-effort */
  }

  // ── Latest screening band (descriptive, NOT a diagnosis) ──────────────────
  const band = latestScreeningBand();
  if (band) lines.push(`- ${band} (from a self-screening they took — context only, never to be quoted back as a label).`);

  // Conversation memory — what you (Nila) jotted down after past talks (services/nilaMemory.ts).
  const memory = recentMemoryLines(3);
  // Durable, consolidated insights — the long arc (services/nilaInsights.ts).
  const insights = insightsContextBlock();
  // User-owned profile — Core facts + Active focus, captured only with their say-so (services/nilaProfile.ts).
  const profile = profileContextBlock();

  if (lines.length === 0 && !memory && !insights && !profile) return "";

  const out: string[] = [
    "WHAT YOU ALREADY KNOW ABOUT THEM",
    "These come from their own private history on this device. Reference them gently and naturally, the",
    "way a friend recalls things — never read them back like a report, never lead with them, and never",
    "claim to know more than this. If something seems stale, trust what they tell you now.",
  ];
  if (profile) out.push(profile);
  if (insights) {
    out.push("Over time (longer-term things you've come to understand about them — hold gently, may be out of date):");
    out.push(insights);
  }
  if (memory) {
    out.push("From your past talks with them (your own notes):");
    out.push(memory);
  }
  if (lines.length) {
    out.push("From their check-ins (recently):");
    out.push(...lines);
  }
  return out.join("\n");
}

/**
 * A compact, DERIVED summary of ~30 days for the daily reflection job. PRIVACY: reads ONLY structured
 * fields (mood label, intensity, skill names, episode timeOfDay, screening score, streak) — NEVER
 * free-text like a check-in's `context`, a diary's `quickNotes`/`morningIntention`, or an episode's
 * `trigger`. Returns "" when there's essentially nothing. Mirrors buildPersonalContext's aggregation
 * (same private helpers) at a wider window and a denser, data-shaped format for the model.
 */
export function buildReflectionDigest(): string {
  const since = daysAgo(30);
  const lines: string[] = [];

  const checkins = readArray("nilamind_checkins").filter((e) => {
    const d = new Date(e?.date);
    return !isNaN(d.getTime()) && d >= since;
  });
  if (checkins.length) {
    const intensities = checkins.map((e) => Number(e.intensity)).filter((n) => !isNaN(n));
    const avg = intensities.length
      ? Math.round((intensities.reduce((a, n) => a + n, 0) / intensities.length) * 10) / 10
      : null;
    const emotions = topCounts(checkins.map((e) => cleanEmotion(e.emotion)).filter(Boolean), 5);
    let l = `Check-ins (30d): ${checkins.length}`;
    if (emotions.length) l += `; most-felt ${joinNatural(emotions)}`;
    if (avg !== null) l += `; avg distress ${avg}/10`;
    lines.push(l + ".");
  }

  // Diary is an OBJECT keyed by date (not an array), so read its values; take ONLY skillsUsed (a
  // selected-name list) — never quickNotes/morningIntention free-text.
  const diaryEntries: any[] = (() => {
    try {
      const raw = secureLocal.getItem("nilamind_diary");
      const obj = raw ? JSON.parse(raw) : null;
      return obj && typeof obj === "object" ? Object.values(obj) : [];
    } catch {
      return [];
    }
  })();
  const helped = topCounts(
    [
      ...readArray("nilamind_episodes").flatMap((e) =>
        Array.isArray(e?.skillsHelpful) ? e.skillsHelpful.map((s: unknown) => String(s)) : [],
      ),
      ...diaryEntries.flatMap((e) =>
        Array.isArray(e?.skillsUsed) ? e.skillsUsed.map((s: unknown) => String(s)) : [],
      ),
    ],
    5,
  );
  if (helped.length) lines.push(`Skills that have helped: ${joinNatural(helped)}.`);

  const episodes = readArray("nilamind_episodes").filter((e) => {
    const d = new Date(e?.date);
    return !isNaN(d.getTime()) && d >= since;
  });
  if (episodes.length) {
    const when = topCounts(episodes.map((e) => String(e?.timeOfDay || "").trim()).filter(Boolean), 2);
    lines.push(`Hard moments (30d): ${episodes.length}${when.length ? `; often ${joinNatural(when)}` : ""}.`);
  }

  try {
    const streak = computeCompassionateStreak();
    if (streak?.current && streak.current >= 2) lines.push(`Showing up: ${streak.current}-day streak.`);
  } catch {
    /* best-effort */
  }

  const band = latestScreeningBand();
  if (band) lines.push(`${band} (context only, never a label).`);

  return lines.join("\n");
}

/** Map the most recent PHQ-9 / GAD-7 screening to a soft, non-clinical descriptor, or "" if none.
 *  Reads the real AssessmentEntry shape (instrument/total/severity); prefers the stored band label. */
function latestScreeningBand(): string {
  const all = readArray("nilamind_assessments")
    .filter((a) => a && (a.instrument === "PHQ-9" || a.instrument === "GAD-7") && typeof a.total === "number")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (!all.length) return "";
  const a = all[0];
  const id = a.instrument as "PHQ-9" | "GAD-7";
  const inst = INSTRUMENTS[id];
  const band = (typeof a.severity === "string" && a.severity)
    || inst?.bands.find((b) => a.total >= b.min && a.total <= b.max)?.label
    || "";
  if (!band) return "";
  const what = id === "PHQ-9" ? "mood screening" : "anxiety screening";
  return `Their last ${what} sat in the ${band.toLowerCase()} range`;
}

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
import { getActiveProgress } from "./protocolProgress";
import { insightsContextBlock } from "./nilaInsights";
import { profileContextBlock } from "./nilaProfile";
import { selfReportSleepSignal, selfReportedSleepNights } from "./sleepInsight";
import { loadMoodHistory } from "./moodHistory";
import type { SleepSignal } from "./healthConnect";
import { topFireableSignal, type InflectionSignal } from "./nilaInflection";
import { getInflectionEnabled } from "./inflectionPrefs";
import { INSTRUMENTS, type AssessmentEntry } from "./assessments";
import { wellbeingLongitudinal } from "./wellbeingTrack";
import { episodeMarkerSummary } from "./episodeMarker";
import { listCaregiverContacts } from "./caregiverContacts";
import { DAY_MS } from "./storageUtils";
import { parseSafetyPlan } from "./safetyPlan";
import { safetyPlanFollowUpContextBlock } from "./safetyPlanFollowUp";
import { generateMeansSafetyContextBlock } from "./lethalMeansCoaching";
import { sleepHoursVariability, variabilityContextBlock } from "./sleepHoursVariability";
import type { VariabilitySignal } from "./sleepHoursVariability";
import { assessJitai } from "./jitaiEngine";
import { computeUsageSummary } from "./usageAnalytics";
import { computeCircadianFeedback } from "./circadianFeedback";
import { computeRhythmRegularity } from "./socialRhythm";
import { runStateEngine } from "./stateEngine";
// #8 (audit): these were pulled via CommonJS require() below, which throws "require is not defined" in the
// ESM Capacitor WebView bundle and was swallowed by try/catch — so BA + proactive context silently never
// reached Nila in production. Static ESM imports (no import cycle: neither module imports nilaContext).
import { computeInsight, loadActivities } from "./behaviouralActivation";
import { computeProactiveMoment, proactiveContextBlock } from "./proactiveEngine";
import { loadAlliance } from "./allianceSignal";
import { getDisengagementContextBlock } from "./disengagementPredictor";
import { getAdherenceSummary } from "./protocolAdherence";

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
  const diff = Math.round((today.getTime() - d.getTime()) / DAY_MS);
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
 * Surface the current TRAJECTORY signal — today the short-sleep manic-prodrome (healthConnect.shortSleepSignal,
 * Lim 2024 / Lewis 2017) — as a gentle heads-up for Nila. PURE (the signal is passed in), so it's unit-testable
 * and the live wiring stays a one-liner. Empty unless firing. Framed sense→ask→confirm: hold it gently and,
 * only if it fits, ask about rest — never alarm, never diagnose. For a manic-first app this is the earliest
 * warning the app has; before this it reached the user AND the chat nowhere (2026-07-06 audit).
 */
export function trajectoryContextBlock(sleep: SleepSignal | null): string {
  if (!sleep?.firing) return "";
  const base = sleep.baselineHours ? ` (~${sleep.baselineHours}h)` : "";
  return [
    "SOMETHING TO HOLD GENTLY (from their own logs)",
    `Their self-logged sleep has been short lately — ${sleep.nightsBelow} night${sleep.nightsBelow === 1 ? "" : "s"} ` +
      `below their usual${base}. For them, short sleep can come before feeling wired or speeding up, so hold this ` +
      "gently and — only if it fits the moment — ask softly how rest has been. Never alarm them, never diagnose, " +
      "never quote this back as a fact.",
  ].join("\n");
}

/**
 * Feed a detected trajectory SHIFT (nilaInflection — a reliable-change / valence-aware trend in the person's
 * OWN check-in + screening history) into Nila's awareness. PURE (signal passed in). Before this the shift was
 * only a UI opener bubble, so the model reply that followed had no idea a deterioration was flagged (audit
 * 2026-07-06). Held gently: never lead with it, never quote it as fact. The call site gates on the user's
 * inflection opt-in, so enabling inflection makes Nila attuned — not just adds a bubble.
 */
export function inflectionContextBlock(sig: InflectionSignal | null): string {
  if (!sig) return "";
  const header = "A SHIFT IN THEIR OWN TRAJECTORY (hold gently)";
  if (sig.direction === "improvement") {
    return [header,
      `Their own recent data shows things easing a little (${sig.detail}). If it feels true to them you can ` +
      "gently notice it with them — warmly, without overclaiming or making them perform being okay."].join("\n");
  }
  return [header,
    `Their own recent data shows a downward shift (${sig.detail}). Hold this gently — don't lead with it or quote ` +
    "it as a fact; let it make you a little more attentive, and only if the moment fits, ask softly how they've been."].join("\n");
}

/**
 * Anti-sycophancy context block — tells Nila explicitly not to validate grandiosity,
 * impulsivity, or paranoia. This is the ONLY place the anti-sycophancy stance is
 * communicated to the model; the deterministic output gate (safety.ts checkResponse
 * Rules 5–6) is the hard backstop.
 */
export function antiSycophancyContextBlock(): string {
  return [
    "ANTI-SYCOPHANCY STANCE (non-negotiable):",
    "You are an anti-sycophantic companion. You do NOT validate unrealistic plans,",
    "grandiosity, treatment-superiority delusions, impulsive risk-taking (spending,",
    "quitting, betting), sleep denial, or paranoia-as-fact. If the user expresses these,",
    "gently hold the line: \"I hear you, and I'm not going to agree that's a good idea.\"",
    "Warm de-escalation is the goal — never affirm the harmful belief, never lecture.",
    "The same stance covers harsh self-beliefs: if they say they're a failure/worthless/unlovable",
    "or that everyone hates them, never half-agree ('maybe you haven't found success…' is collusion).",
    "Reflect the pain, then gently question the all-or-nothing story — never argue, never lecture.",
  ].join(" ");
}

/**
 * Longitudinal wellbeing (Phase 17). Surfaces the validated WHO-5 trend to Nila as a gentle,
 * wellness-framed pattern over time — never a diagnosis. (🟡 touches a flagged file; review before merge.)
 */
export function wellbeingContextBlock(history?: AssessmentEntry[]): string {
  const wb = wellbeingLongitudinal(history);
  if (!wb.taken) return "";
  const trend =
    wb.trajectory === "reliably_improved"
      ? "been improving"
      : wb.trajectory === "reliably_deteriorated"
        ? "been drifting downward"
        : "been steady";
  return `- Their wellbeing (WHO-5) over time has ${trend}${wb.isDue ? "; their fortnightly check is due" : ""}.`;
}

/**
 * Episode-phase markers (Phase 18). Surfaces the user's own bipolar-phase tag to Nila as a gentle,
 * pattern-level note — never a diagnosis. (🟡 touches a flagged file; review before merge.)
 */
export function episodeMarkerContextBlock(): string {
  return episodeMarkerSummary();
}

/**
 * Caregiver contacts (Phase 19). Notes whether the user shares wellness snapshots with trusted
 * people — a gentle, relational signal, never a clinical note. (🟡 flagged file; review before merge.)
 */
export function caregiverContextBlock(): string {
  const contacts = listCaregiverContacts();
  if (contacts.length === 0) return "";
  const names = contacts.map((c) => c.name).join(", ");
  return `- They share wellness snapshots with ${contacts.length === 1 ? "one trusted person" : contacts.length + " trusted people"} (${names}).`;
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

    // Granular emotions — rich feeling words they used beyond just "Low"/"Anxious"
    const granular = checkins
      .filter((e) => typeof e?.granularEmotion === "string" && (e.granularEmotion as string).length > 0)
      .map((e) => e.granularEmotion as string);
    if (granular.length >= 2) {
      const distinct = [...new Set(granular)].slice(0, 4);
      lines.push(`- When they named their feelings precisely, they used words like: ${joinNatural(distinct)}.`);
    }

    // Energy trend — rising/falling/stable over recent check-ins (Phase 1.4)
    const withEnergy = checkins.filter((e) => typeof e.energy === "number");
    if (withEnergy.length >= 3) {
      const energies = withEnergy.map((e) => e.energy as number);
      const half = Math.ceil(energies.length / 2);
      const firstAvg = energies.slice(0, half).reduce((a, n) => a + n, 0) / half;
      const secondAvg = energies.slice(-half).reduce((a, n) => a + n, 0) / half;
      const diff = secondAvg - firstAvg;
      const trend = diff > 0.5 ? "rising" : diff < -0.5 ? "falling" : "stable";
      lines.push(`- Their energy has been ${trend} over recent check-ins.`);
    }

    // Prevailing state quadrant — Calm/Vibrant/Sluggish/Agitated (Phase 1.5)
    const withBoth = checkins.filter((e) => typeof e.intensity === "number" && typeof e.energy === "number");
    if (withBoth.length >= 3) {
      const qCounts: Record<string, number> = {};
      for (const e of withBoth) {
        const d = e.intensity;
        const en = e.energy as number;
        const q = d <= 4 && en <= 2 ? "Calm" : d <= 4 && en >= 3 ? "Vibrant" : d >= 7 && en <= 2 ? "Sluggish" : d >= 7 && en >= 3 ? "Agitated" : "Mixed";
        qCounts[q] = (qCounts[q] || 0) + 1;
      }
      const topQ = Object.entries(qCounts).sort((a, b) => b[1] - a[1])[0][0];
      if (topQ !== "Mixed") {
        lines.push(`- Their most common state has been "${topQ}" — a combination of mood and energy.`);
      }
    }
  }

  // ── Longitudinal wellbeing (Phase 17) ──────────────────────────────────────
  // Reuses the validated WHO-5 history. Wellness framing only — a pattern over time, never a
  // diagnosis. (🟡 touches a flagged file; reviewed before merge.)
  {
    const wbBlock = wellbeingContextBlock();
    if (wbBlock) lines.push(wbBlock);
  }

  // ── Episode-phase markers (Phase 18) ───────────────────────────────────────
  // User-owned bipolar-phase tagging (elevated/depressed/mixed/stable). A pattern they noticed,
  // never a diagnosis. (🟡 touches a flagged file; reviewed before merge.)
  {
    const emBlock = episodeMarkerContextBlock();
    if (emBlock) lines.push(emBlock);
  }

  // ── Caregiver contacts (Phase 19) ──────────────────────────────────────────
  // Notes whether the user shares wellness snapshots with trusted people — a gentle,
  // relational signal. (🟡 touches a flagged file; reviewed before merge.)
  {
    const cgBlock = caregiverContextBlock();
    if (cgBlock) lines.push(cgBlock);
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

  // ── Showing up (streak — Phase 8: forgiving, non-pressure language) ───────
  try {
    const streak = computeCompassionateStreak();
    if (streak?.totalActiveDays && streak.totalActiveDays >= 2) {
      lines.push(`- They keep showing up for themselves — ${streak.totalActiveDays} days of self-care logged so far.`);
    }
  } catch {
    /* streak is best-effort */
  }

  // ── Behavioural Activation (recent activity log) ─────────────────────────
  try {
    const baActs = loadActivities();
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
    const recent = baActs.filter((a: any) => a.date >= twoWeeksAgo);
    if (recent.length > 0) {
      const done = recent.filter((a: any) => a.status === "done");
      if (done.length > 0) {
        let baLine = `- In the last two weeks they logged ${done.length} activit${done.length === 1 ? "y" : "ies"} they did.`;
        const insight = computeInsight(recent);
        if (insight.topCategory) baLine += ` ${insight.topCategory.label} activities seem to lift them most.`;
        if (insight.avgMastery != null) baLine += ` Avg mastery: ${Math.round(insight.avgMastery)}/10.`;
        lines.push(baLine);
      }
    }
  } catch {
    /* BA data is best-effort */
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
  // Current trajectory (the short-sleep manic-prodrome) — the earliest warning a manic-first app has.
  const trajectory = trajectoryContextBlock(selfReportSleepSignal());
  // Sleep hours variability — circadian regularity signal (C1). Soft-signal nudge only.
  const sleepVariability = variabilityContextBlock(sleepHoursVariability(selfReportedSleepNights()));
  // Circadian + social rhythm fused feedback — combined score + guidance for Nila to reference.
  let circadianBlock = "";
  try {
    const moodHist = loadMoodHistory();
    const sleeps = moodHist
      .filter((m) => typeof m.sleepHours === "number" && m.sleepHours > 0)
      .map((m) => m.sleepHours as number);
    if (sleeps.length >= 3) {
      const rhythmReg = computeRhythmRegularity();
      const feedback = computeCircadianFeedback({ sleeps, rhythmVariabilityMin: rhythmReg.overallVariabilityMin });
      if (feedback && feedback.needsAttention) {
        circadianBlock = `CIRCADIAN FEEDBACK: ${feedback.guidance} Combined score: ${feedback.combinedScore}/100.`;
      }
    }
  } catch { /* best-effort */ }
  // A detected trend shift — only when the user has opted into inflection awareness.
  const inflection = getInflectionEnabled() ? inflectionContextBlock(topFireableSignal()) : "";

  // Safety-plan follow-up (B3 — Stanley-Brown loop). Only generates a block when the plan is stale.
  // Gentle invitation, never a demand. Never surfaced without the user choosing to engage.
  let safetyPlanFollowUp = "";
  try {
    const raw = secureLocal.getItem("nilamind_safetyplan");
    if (raw) {
      safetyPlanFollowUp = safetyPlanFollowUpContextBlock(parseSafetyPlan(raw));
    }
  } catch { /* best-effort, never block context assembly */ }

  // Means safety coaching context — lets Nila know if the user has explored means safety (Phase 7).
  // Read-only context flag: if the user brings it up, Nila can acknowledge gently. Never asked about unprompted.
  let meansSafetyContext = "";
  try {
    const raw = secureLocal.getItem("nilamind_means_coaching");
    if (raw) {
      const progress = JSON.parse(raw);
      meansSafetyContext = generateMeansSafetyContextBlock(progress);
    }
  } catch { /* best-effort */ }

  // JITAI nudge — just-in-time adaptive intervention. Only surfaces when signals indicate a tool would help.
  let jitaiNudge = "";
  try {
    const moodHist = loadMoodHistory();
    if (moodHist.length > 0) {
      const lastCheckin = moodHist[moodHist.length - 1];
      const daysSinceLastCheckin = Math.max(0, Math.floor((Date.now() - new Date(lastCheckin.date).getTime()) / 86400000));
      const jitai = assessJitai({ sleep: selfReportSleepSignal(), moodHistory: moodHist, daysSinceLastCheckin, usageAnalytics: computeUsageSummary() });
      if (jitai.shouldNudge) {
        jitaiNudge = `JUST-IN-TIME NUDGE (${jitai.severity}): ${jitai.nudgeText}`;
        if (jitai.suggestedTool) jitaiNudge += ` Suggested tool: ${jitai.suggestedTool}.`;
      }
    }
  } catch { /* best-effort */ }

  // Consolidated state-engine signal summary — surfaces the synthesized mood state and any
  // risk/protective signals the deterministic engines detect (sleep prodrome, circadian,
  // JITAI, BA, streak, social). Complements the per-block context above. Best-effort.
  let stateEngineBlock = "";
  try {
    const engineCheckins = readArray("nilamind_checkins");
    const engineMood = loadMoodHistory();
    const engineAssessments = readArray("nilamind_assessments");
    const engineDiary = readArray("nilamind_diary");
    const engineEpisodes = readArray("nilamind_episodes");
    const engineSnaps: import("./phoneBehaviour").BehaviourSnapshot[] = [];
    const engineDaysSinceLast = engineMood.length > 0
      ? Math.max(0, Math.floor((Date.now() - new Date(engineMood[engineMood.length - 1].date).getTime()) / 86400000))
      : 999;
    const engine = runStateEngine({
      checkins: engineCheckins,
      mood: engineMood,
      assessments: engineAssessments,
      diary: engineDiary,
      episodes: engineEpisodes,
      snaps: engineSnaps,
      daysSinceLastCheckin: engineDaysSinceLast,
    });
    const seLines: string[] = [];
    if (engine.moodState && engine.moodConfidence >= 0.4) {
      seLines.push(`Synthesised state: ${engine.moodState} (confidence ${Math.round(engine.moodConfidence * 100)}%).`);
    }
    for (const sig of engine.protectiveSignals) {
      seLines.push(`Protective: ${sig.label} — ${sig.detail}`);
    }
    for (const sig of engine.riskSignals) {
      seLines.push(`Watch: ${sig.label} — ${sig.detail}`);
    }
    if (seLines.length > 0) stateEngineBlock = seLines.join("\n");
  } catch { /* best-effort — state engine is optional context */ }

  // Therapeutic alliance proxy — passive behavioral estimate of bond/goals/tasks.
  // Only included when there's enough data for a meaningful signal.
  let allianceBlock = "";
  try {
    const state = loadAlliance();
    if (state.current && state.trend !== "insufficient_data") {
      allianceBlock = `ALLIANCE SIGNAL: bond ${state.current.bond}, goals ${state.current.goals}, tasks ${state.current.tasks} — trend: ${state.trend}.`;
    }
  } catch { /* best-effort */ }

  // Engagement disengagement risk — early warning when usage is declining.
  let disengagementBlock = "";
  try {
    const moodHist = loadMoodHistory();
    if (moodHist.length > 0) {
      const checkinDates = readArray("nilamind_checkins").map((c: any) => c.date).filter(Boolean);
      const appOpenDays: string[] = [];
      try {
        const raw = secureLocal.getItem("nilamind_app_opens");
        if (raw) { const p = JSON.parse(raw); appOpenDays.push(...(Array.isArray(p.days) ? p.days : Array.isArray(p) ? p : [])); }
      } catch { /* best-effort */ }
      const lastCheckin = moodHist[moodHist.length - 1];
      const daysSinceLastCheckin = Math.max(0, Math.floor((Date.now() - new Date(lastCheckin.date).getTime()) / 86400000));
      const lastOpenDay = appOpenDays.length > 0 ? appOpenDays[appOpenDays.length - 1] : null;
      const daysSinceLastAppOpen = lastOpenDay ? Math.max(0, Math.floor((Date.now() - new Date(lastOpenDay + "T00:00:00").getTime()) / 86400000)) : 999;
      const adherence = getAdherenceSummary();
      const alliance = loadAlliance();
      const usage = computeUsageSummary();
      const block = getDisengagementContextBlock({
        checkinDates,
        appOpenDays,
        protocolAdherenceRate: adherence.adherenceRate,
        allianceTrend: alliance.trend,
        daysSinceLastCheckin,
        daysSinceLastAppOpen,
        protocolCount: adherence.totalStarted,
        featureCount: usage.features.length,
      });
      if (block) disengagementBlock = block;
    }
  } catch { /* best-effort */ }

  if (lines.length === 0 && !memory && !insights && !profile && !trajectory && !inflection && !safetyPlanFollowUp && !sleepVariability && !jitaiNudge && !circadianBlock && !meansSafetyContext && !stateEngineBlock && !allianceBlock && !disengagementBlock) return "";

  const out: string[] = [
    // Terse header only. HOW to use memory (gently, never recite, don't over-claim, trust the present) already
    // lives in the persona — repeating it here re-prefilled ~55 tokens every turn, and prefill is the dominant
    // first-reply cost on this binding (no cross-turn KV reuse).
    "WHAT YOU ALREADY KNOW ABOUT THEM (reference gently, never recite, never over-claim):",
  ];
  if (trajectory) out.push(trajectory);
  if (sleepVariability) out.push(sleepVariability);
  if (circadianBlock) out.push(circadianBlock);
  if (inflection) out.push(inflection);
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

  if (safetyPlanFollowUp) {
    out.push("Safety-plan follow-up (gentle invitation, never a push):");
    out.push(safetyPlanFollowUp);
  }

  if (meansSafetyContext) {
    out.push(meansSafetyContext);
  }

  // Consolidated state-engine signal summary (mood state + risk/protective signals).
  // Included when non-empty — gives Nila the synthesized picture from all deterministic engines.
  if (stateEngineBlock) {
    out.push("STATE SIGNALS (from all data):");
    out.push(stateEngineBlock);
  }

  // Therapeutic alliance proxy — passive behavioral estimate of how the user is engaging.
  // Included when there's enough data (not "insufficient_data"). Used for tone awareness only.
  if (allianceBlock) {
    out.push(allianceBlock);
  }

  // Anti-sycophancy stance — always included so the model knows not to validate
  // grandiosity, impulsivity, or paranoia. Hard backstop is safety.ts checkResponse Rules 5–6.
  out.push(antiSycophancyContextBlock());

  // #20 (audit): cap the per-turn context. It is re-prefilled every turn (no cross-turn KV reuse on this
  // binding) and, uncapped, a data-rich user's context grew large enough that windowMessages starved the
  // transcript to MIN_TRANSCRIPT_CHARS (400), dropping conversation history. The lowest-priority, explicitly
  // optional nudges (jitai, then proactive) yield FIRST — they are skipped once the core context (through the
  // safety-plan follow-up, which is always kept) already fills the budget. Safety-relevant blocks never drop.
  const CONTEXT_CHAR_BUDGET = 1800; // was 2800 — this block is re-prefilled EVERY turn (no KV reuse) and is the
                                     // dominant first-reply cost; tightened for speed. The priority order below
                                     // still drops the lowest-value nudges (jitai, proactive) first and always
                                     // keeps the core memory + safety-relevant blocks.
  const overBudget = () => out.join("\n").length > CONTEXT_CHAR_BUDGET;

  if (jitaiNudge && !overBudget()) {
    out.push("Just-in-time nudge (use if it fits naturally — never force it):");
    out.push(jitaiNudge);
  }

  // Proactive moment — what the app offered on this session open.
  // The UI already shows the card; this tells Nila about it so she can reference it naturally.
  if (!overBudget()) {
    let proactiveBlock = "";
    try {
      const moment = computeProactiveMoment();
      proactiveBlock = proactiveContextBlock(moment);
    } catch { /* best-effort */ }
    if (proactiveBlock) {
      out.push(proactiveBlock);
    }
  }

  // Engagement disengagement risk — early warning when usage patterns signal declining engagement.
  // Only included when risk is moderate or higher and the budget allows. Used for tone awareness.
  if (disengagementBlock && !overBudget()) {
    out.push(disengagementBlock);
  }

  return out.join("\n");
}

/**
 * Grounding for a structured program the person is PARTWAY through (see protocols.ts / protocolProgress.ts), so a
 * free-text message mid-program gets a program-aware reply — not a generic one — even when they don't tap the
 * "Continue" card. Deterministic + vetted (reads getActiveProgress): Nila is told which program, which step, and
 * to meet them where they are without restarting or racing ahead. Empty when nothing is active. Safety is
 * unchanged — §9 and the output gates wrap every turn regardless of this context.
 */
export function activeProtocolContextBlock(): string {
  const active = getActiveProgress();
  if (!active) return "";
  const { protocol, step, stepIndex, total } = active;
  return [
    "A PROGRAM YOU'RE PARTWAY THROUGH TOGETHER",
    `They're working through "${protocol.title}" with you — a structured, evidence-based program ` +
      `(step ${stepIndex + 1} of ${total}). This step is about: ${step.title}.`,
    "If they bring it up or seem ready, gently help them with THIS step, where they are — don't restart the " +
      "program from the beginning, and don't race ahead to later steps. If they'd rather talk about something " +
      'else, follow them there; the program will keep. (They can also tap "Continue" to step through it with you.)',
  ].join("\n");
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
    if (streak?.totalActiveDays && streak.totalActiveDays >= 2) lines.push(`Showed up: ${streak.totalActiveDays} total days.`);
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

import { secureLocal } from "./secureLocal";
import { loadMoodHistory } from "./moodHistory";

const COMPLETIONS_KEY = "nilamind_protocol_completions";

export interface ProtocolCompletion {
  protocolId: string;
  date: string; // YYYY-MM-DD
  stepIndex: number;
}

export interface No1Insight {
  protocolId: string;
  protocolName: string;
  avgDelta: number; // negative = distress went down after completion
  completions: number;
  description: string;
}

export interface No1DashboardCard {
  title: string;
  insight: string;
  protocolId: string;
}

function readCompletions(): ProtocolCompletion[] {
  try {
    const raw = secureLocal.getItem(COMPLETIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeCompletions(completions: ProtocolCompletion[]): void {
  try {
    secureLocal.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
  } catch { /* ignore */ }
}

/** Record a protocol completion for N-of-1 tracking. */
export function recordProtocolCompletion(protocolId: string, date: string, stepIndex = -1): void {
  const completions = readCompletions();
  completions.push({ protocolId, date, stepIndex });
  // Cap at 200 entries to avoid unbounded growth
  if (completions.length > 200) completions.splice(0, completions.length - 200);
  writeCompletions(completions);
}

/** Backfill completions from existing protocolProgress (for migration). */
export function backfillNof1(): void {
  try {
    const raw = secureLocal.getItem("nilamind_protocol_progress");
    if (!raw) return;
    const progress = JSON.parse(raw);
    if (!progress || !progress.protocolId) return;
    const today = new Date().toISOString().split("T")[0];
    recordProtocolCompletion(progress.protocolId, today, progress.stepIndex || 0);
  } catch { /* ignore */ }
}

/** Compute average next-day distress delta for each protocol with >=2 completions. */
function computeNof1RankingInternal(): Array<{
  protocolId: string;
  avgDelta: number;
  completions: number;
}> {
  const completions = readCompletions();
  if (completions.length < 2) return [];

  const moodHist = loadMoodHistory();
  if (moodHist.length < 2) return [];

  // Map date -> intensity
  const intensityByDate = new Map<string, number>();
  for (const m of moodHist) {
    if (typeof m.intensity === "number" && m.date) {
      intensityByDate.set(m.date, m.intensity);
    }
  }

  // Group completions by protocol
  const byProtocol = new Map<string, ProtocolCompletion[]>();
  for (const c of completions) {
    if (!c.date) continue;
    const arr = byProtocol.get(c.protocolId) || [];
    arr.push(c);
    byProtocol.set(c.protocolId, arr);
  }

  const results: Array<{ protocolId: string; avgDelta: number; completions: number }> = [];

  for (const [protocolId, comps] of byProtocol) {
    let totalDelta = 0;
    let count = 0;

    for (const c of comps) {
      const todayIntensity = intensityByDate.get(c.date);
      const nextDay = new Date(c.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split("T")[0];
      const nextIntensity = intensityByDate.get(nextDayStr);

      if (todayIntensity != null && nextIntensity != null) {
        totalDelta += nextIntensity - todayIntensity; // negative = improvement
        count++;
      }
    }

    if (count >= 2) {
      results.push({ protocolId, avgDelta: totalDelta / count, completions: count });
    }
  }

  // Sort by avgDelta ascending (most improvement first)
  return results.sort((a, b) => a.avgDelta - b.avgDelta);
}

export { computeNof1RankingInternal as computeNof1Ranking };

/** Return the protocol with strongest evidence of reducing distress, or null. */
export function bestProtocolForUser(): string | null {
  const ranking = computeNof1Ranking();
  return (ranking.length && ranking[0].avgDelta < 0) ? ranking[0].protocolId : null;
}

function computeNof1Ranking(): Array<{ protocolId: string; avgDelta: number; completions: number }> {
  return computeNof1RankingInternal();
}

/** User-facing insights for InsightsScreen — top 3 with gentle framing. */
export function getNo1Insights(): No1Insight[] {
  const ranking = computeNof1Ranking();
  if (!ranking.length) return [];

  const protocolNames: Record<string, string> = {
    "behavioural-activation": "Values to Action",
    "self-compassion": "Self-Compassion",
    "dbt": "DBT Skills",
    "act": "ACT",
    "worry": "Worry Time",
    "assertion": "Assertion Training",
  };

  return ranking.slice(0, 3).map((r, idx) => {
    const name = protocolNames[r.protocolId] || r.protocolId;
    const direction = r.avgDelta < 0 ? "lower" : "higher";
    const magnitude = Math.abs(r.avgDelta).toFixed(1);
    const templates = [
      `When you complete ${name}, your mood tends to be ${magnitude} points ${direction} the next day.`,
      `A pattern we've noticed: after ${name}, your distress often shifts ${direction} by about ${magnitude} points.`,
      `Your data suggests ${name} correlates with ${magnitude}-point ${direction} mood the following day.`,
    ];
    return {
      protocolId: r.protocolId,
      protocolName: name,
      avgDelta: r.avgDelta,
      completions: r.completions,
      description: templates[idx % templates.length] +
        " This is a pattern from your data — it might not always hold, but it's worth being aware of.",
    };
  });
}

/** Dashboard card — single top insight. */
export function getNo1DashboardCard(): No1DashboardCard | null {
  const insights = getNo1Insights();
  if (!insights.length) return null;

  const top = insights[0];
  const direction = top.avgDelta < 0 ? "lower" : "higher";
  const magnitude = Math.abs(top.avgDelta).toFixed(1);

  return {
    title: `What affects your mood most`,
    insight: `After ${top.protocolName}, your mood is often ${magnitude} pts ${direction} the next day (${top.completions} sessions).`,
    protocolId: top.protocolId,
  };
}

/** Context block for Nila — only includes top insight, gently framed. */
export function no1ContextBlock(): string {
  const insights = getNo1Insights();
  if (!insights.length) return "";

  const top = insights[0];
  const direction = top.avgDelta < 0 ? "lower" : "higher";
  const magnitude = Math.abs(top.avgDelta).toFixed(1);

  return [
    "FOR THIS PERSON SPECIFICALLY (hold gently, may be out of date):",
    `Their ${top.protocolName} sessions correlate with ${magnitude}-point ${direction} mood the next day (${top.completions} sessions).`,
    "If they mention this protocol, you can gently reflect: \"You've noticed that tends to help.\" Never present as fact.",
  ].join(" ");
}
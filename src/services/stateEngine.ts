// State Engine (B2) — a deterministic, evidence-linked digest of the person's current state.
// Consolidates signals that already exist in the codebase: sleep (sleepInsight/healthConnect),
// trajectory shifts (nilaInflection), phone-behaviour patterns (patternInsights), and behavioural-activation
// logs (behaviouralActivation). Returns a compact estimate that is fed into Nila's system prompt.
//
// Design rules:
// - PURE core: computeStateEstimate takes data as arguments; only currentStateEstimate reads live stores.
// - Never diagnostic; every signal carries its research basis.
// - Empty unless the user's own data honestly supports a signal.

import type { BehaviourSnapshot } from "./phoneBehaviour";
import { generateInsights, type Insight, type MoodPoint } from "./patternInsights";
import { shortSleepSignal, type SleepNight } from "./healthConnect";
import type { InflectionSignal } from "./nilaInflection";
import type { BAInsight } from "./behaviouralActivation";
import { getRecentSnapshots } from "../db/behaviourDb";
import { loadMoodHistory } from "./moodHistory";
import { topFireableSignal } from "./nilaInflection";
import { getInflectionEnabled } from "./inflectionPrefs";

export type StateSignalDirection = "risk" | "protective" | "neutral" | "deterioration" | "improvement";

export interface StateSignal {
  source: "sleep" | "inflection" | "pattern" | "behavioural_activation";
  direction: StateSignalDirection;
  label: string;
  detail: string;
  basis: string;
  dataPoints: number;
}

export interface StateEstimate {
  signals: StateSignal[];
  summary: string;
}

export interface StateEstimateInputs {
  snapshots: BehaviourSnapshot[];
  mood: MoodPoint[];
  inflection?: InflectionSignal | null;
  baInsight?: BAInsight | null;
}

function sleepNightsFromMood(mood: MoodPoint[]): SleepNight[] {
  return mood
    .filter((m) => typeof m.sleepHours === "number")
    .map((m) => ({ date: m.date, hours: m.sleepHours as number }));
}

function sleepSignal(mood: MoodPoint[]): StateSignal | null {
  const nights = sleepNightsFromMood(mood);
  const sig = shortSleepSignal(nights);
  if (!sig?.firing) return null;
  return {
    source: "sleep",
    direction: "risk",
    label: "Short sleep run",
    detail: sig.detail,
    basis:
      "Shrinking sleep is one of the earliest warning signs of a manic upswing (Lim et al. 2024, npj Digital Medicine; Lewis et al. 2017, British Journal of Psychiatry). " +
      "This is a prompt to ask gently, never an alarm or diagnosis.",
    dataPoints: sig.nightsBelow,
  };
}

function patternSignals(snaps: BehaviourSnapshot[], mood: MoodPoint[]): StateSignal[] {
  return generateInsights(snaps, mood).map((insight: Insight) => ({
    source: "pattern" as const,
    direction: insight.direction as StateSignalDirection,
    label: insight.title,
    detail: insight.finding,
    basis: insight.basis,
    dataPoints: insight.dataPoints,
  }));
}

function inflectionSignal(sig: InflectionSignal): StateSignal {
  return {
    source: "inflection",
    direction: sig.direction,
    label: `${sig.metric} ${sig.direction}`,
    detail: sig.detail,
    basis: sig.basis,
    dataPoints: sig.dataPoints,
  };
}

function baSignal(insight: BAInsight): StateSignal | null {
  if (insight.done <= 0) return null;
  const top = insight.topCategory;
  return {
    source: "behavioural_activation",
    direction: "protective",
    label: "Activities that lift you",
    detail: top
      ? `You've logged ${insight.done} activity recently; ${top.label} scored highest for you.`
      : `You've logged ${insight.done} activity recently — acting before motivation follows is the core move.`,
    basis:
      "Behavioural activation is one of the best-evidenced behavioural approaches for low mood: scheduling valued activity improves mood through renewed contact with reward (Martell et al., 2001; Dimidjian et al., 2006).",
    dataPoints: insight.done,
  };
}

function severityRank(direction: StateSignalDirection): number {
  switch (direction) {
    case "deterioration":
    case "risk":
      return 0;
    case "neutral":
      return 1;
    case "improvement":
    case "protective":
      return 2;
  }
}

function buildSummary(signals: StateSignal[]): string {
  if (signals.length === 0) return "no clear signal";
  const ordered = [...signals].sort((a, b) => severityRank(a.direction) - severityRank(b.direction));
  return ordered
    .slice(0, 3)
    .map((s) => `${s.label} (${s.direction})`)
    .join(" + ");
}

/** PURE. Build a state estimate from existing on-device signals. */
export function computeStateEstimate({ snapshots, mood, inflection, baInsight }: StateEstimateInputs): StateEstimate {
  const signals: StateSignal[] = [];

  const sleep = sleepSignal(mood);
  if (sleep) signals.push(sleep);

  signals.push(...patternSignals(snapshots, mood));

  if (inflection) signals.push(inflectionSignal(inflection));

  if (baInsight) {
    const ba = baSignal(baInsight);
    if (ba) signals.push(ba);
  }

  return { signals, summary: buildSummary(signals) };
}

/** Format the state estimate as a system-prompt block. Empty when there is nothing to say. */
export function stateEstimateContextBlock(estimate: StateEstimate): string {
  if (estimate.signals.length === 0) return "";
  const lines = estimate.signals.map(
    (s) => `- ${s.label} (${s.direction}): ${s.detail}\n  Basis: ${s.basis}`,
  );
  return [
    "STATE OF THE PERSON RIGHT NOW (from their own data — hold gently, they are the authority on their own experience):",
    ...lines,
    "Use this only if it fits what they're telling you. Never lead with it, never quote it as fact, and trust what they say now over any pattern.",
  ].join("\n\n");
}

/** Async loader for the current state estimate. Reads live stores, but any failure returns an empty estimate
 *  so the chat never breaks. */
export async function currentStateEstimate(): Promise<StateEstimate> {
  try {
    const snaps = await getRecentSnapshots(30);
    const mood = loadMoodHistory();
    const inflection = getInflectionEnabled() ? topFireableSignal() : null;
    let baInsight: BAInsight | null = null;
    try {
      const { computeInsight, loadActivities } = await import("./behaviouralActivation");
      baInsight = computeInsight(loadActivities());
    } catch {
      /* BA module may not be available in every environment */
    }
    return computeStateEstimate({ snapshots: snaps, mood, inflection, baInsight });
  } catch {
    return { signals: [], summary: "no clear signal" };
  }
}

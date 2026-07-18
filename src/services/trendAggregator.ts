// Phase 21.5 — Rolling trend analysis for passive signals.
// Computes trends across signal domains over 7-day and 30-day windows.
// Produces concise trend summaries for the proactive surface and LLM context.

import type { DailyFeatureSet } from "./signalExtractor";

export interface TrendSummary {
  domain: "sleep" | "activity" | "circadian" | "typing" | "composite";
  direction: "improving" | "stable" | "declining" | "insufficient_data";
  changePercent: number;
  confidence: number;
  oneLine: string;
}

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v != null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function computeDirection(firstHalf: number | null, secondHalf: number | null): TrendSummary["direction"] {
  if (firstHalf == null || secondHalf == null) return "insufficient_data";
  if (firstHalf === 0 && secondHalf === 0) return "stable";
  const change = secondHalf - firstHalf;
  const pct = Math.abs(change) / Math.max(Math.abs(firstHalf), 1);
  if (pct < 0.1) return "stable";
  return change > 0 ? "improving" : "declining";
}

function confidenceFromDataCount(total: number, validCount: number): number {
  if (total === 0) return 0;
  return Math.min(1, validCount / total);
}

/** Compute trends across all domains for the current window. */
export function computeTrends(window: DailyFeatureSet[]): TrendSummary[] {
  if (window.length < 2) return [];

  const half = Math.ceil(window.length / 2);
  const firstHalf = window.slice(0, half);
  const secondHalf = window.slice(half);

  const trends: TrendSummary[] = [];

  // Sleep trend
  const sleepFirst = avg(firstHalf.map((f) => f.sleep.hoursLastNight));
  const sleepSecond = avg(secondHalf.map((f) => f.sleep.hoursLastNight));
  const sleepValid = window.filter((f) => f.sleep.hoursLastNight != null).length;
  const sleepDir = computeDirection(sleepFirst, sleepSecond);
  const sleepChangePct = sleepFirst != null && sleepSecond != null && sleepFirst !== 0
    ? Math.round(((sleepSecond - sleepFirst) / Math.abs(sleepFirst)) * 100)
    : 0;
  trends.push({
    domain: "sleep",
    direction: sleepDir,
    changePercent: sleepChangePct,
    confidence: confidenceFromDataCount(window.length, sleepValid),
    oneLine: sleepDir === "insufficient_data"
      ? "Sleep data insufficient for trend."
      : `Sleep has been ${sleepDir}${sleepChangePct !== 0 ? ` (${sleepChangePct > 0 ? "+" : ""}${sleepChangePct}%)` : ""}.`,
  });

  // Activity trend
  const actFirst = avg(firstHalf.map((f) => f.activity.screenTimeMinutes));
  const actSecond = avg(secondHalf.map((f) => f.activity.screenTimeMinutes));
  const actValid = window.filter((f) => f.activity.screenTimeMinutes != null).length;
  const actDir = computeDirection(actFirst, actSecond);
  const actChangePct = actFirst != null && actSecond != null && actFirst !== 0
    ? Math.round(((actSecond - actFirst) / Math.abs(actFirst)) * 100)
    : 0;
  trends.push({
    domain: "activity",
    direction: actDir,
    changePercent: actChangePct,
    confidence: confidenceFromDataCount(window.length, actValid),
    oneLine: actDir === "insufficient_data"
      ? "Activity data insufficient for trend."
      : `Phone usage has been ${actDir}${actChangePct !== 0 ? ` (${actChangePct > 0 ? "+" : ""}${actChangePct}%)` : ""}.`,
  });

  // Circadian trend
  const circValid = window.filter((f) => f.circadian.firstOpenTime != null).length;
  const circDir = circValid >= window.length * 0.5 ? "stable" : "insufficient_data";
  trends.push({
    domain: "circadian",
    direction: circDir,
    changePercent: 0,
    confidence: confidenceFromDataCount(window.length, circValid),
    oneLine: circDir === "insufficient_data"
      ? "Circadian data insufficient for trend."
      : "Daily rhythm has been consistent.",
  });

  // Typing trend
  const typeFirst = avg(firstHalf.map((f) => f.typing.avgTypingSpeed));
  const typeSecond = avg(secondHalf.map((f) => f.typing.avgTypingSpeed));
  const typeValid = window.filter((f) => f.typing.avgTypingSpeed != null).length;
  const typeDir = computeDirection(typeFirst, typeSecond);
  trends.push({
    domain: "typing",
    direction: typeDir,
    changePercent: 0,
    confidence: confidenceFromDataCount(window.length, typeValid),
    oneLine: typeDir === "insufficient_data"
      ? ""
      : `Typing patterns have been ${typeDir}.`,
  });

  // Composite trend — based on elevation signals
  const elevations = window.filter((f) => f.composite.typingElevationSignal || f.composite.activitySpike).length;
  const elevRate = window.length > 0 ? elevations / window.length : 0;
  const compositeDir = elevRate > 0.3 ? "declining" : elevRate < 0.1 ? "improving" : "stable";
  trends.push({
    domain: "composite",
    direction: compositeDir,
    changePercent: Math.round(elevRate * 100),
    confidence: confidenceFromDataCount(window.length, Math.max(sleepValid, actValid)),
    oneLine: compositeDir === "stable"
      ? ""
      : compositeDir === "declining"
        ? "Some combined patterns are shifting."
        : "Overall patterns look steady.",
  });

  return trends;
}

/** Build the single best passive-signal context line for nilaContext (budget: ~120 chars). */
export function passiveSignalContextLine(trends: TrendSummary[]): string {
  if (trends.length === 0) return "";

  const declining = trends.filter((t) => t.direction === "declining" && t.confidence > 0.3);
  const improving = trends.filter((t) => t.direction === "improving" && t.confidence > 0.3);

  if (declining.length === 0 && improving.length === 0) return "";

  const lines: string[] = [];
  if (declining.length > 0) {
    const domains = declining.map((t) => t.domain).join(", ");
    lines.push(`Passive signals suggest some shifts in: ${domains}.`);
  }
  if (improving.length > 0) {
    const domains = improving.map((t) => t.domain).join(", ");
    lines.push(`Some things are looking steadier: ${domains}.`);
  }

  return lines.join(" ") + " (From phone patterns, not a diagnosis.)";
}

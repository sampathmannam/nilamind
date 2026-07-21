// Proactive assessment prompting — suggest assessments based on detected signals.
// Research: Woebot prompts PHQ-9 every 2 weeks automatically. NilaMind should do the same,
// AND trigger contextually when elevation/inflection signals fire.
// This transforms assessments from "never used" to "contextually relevant."

import { loadAssessments, latestFor, daysSince, type InstrumentId } from "./assessments";
import { topFireableSignal } from "./nilaInflection";
import { selfReportSleepSignal } from "./sleepInsight";
import { emaElevationSignal } from "./ema";

export interface AssessmentPrompt {
  instrument: InstrumentId;
  reason: string;
  priority: "high" | "medium" | "low";
  /** Whether this is a routine (time-based) or contextual (signal-based) prompt. */
  kind: "routine" | "contextual";
  /** True when the user has NEVER taken this instrument — the prompt establishes a baseline rather than
   *  chasing an elapsed cadence. Lets the UI avoid "due" framing on a fresh install (U2, 2026-07-17 QA). */
  firstTime: boolean;
}

const ROUTINE_INTERVAL_DAYS = 14;

/**
 * Check all signals and return a list of suggested assessments.
 * Empty array = nothing to suggest right now.
 */
export function checkAssessmentPrompts(): AssessmentPrompt[] {
  const prompts: AssessmentPrompt[] = [];
  const assessments = loadAssessments();

  // ── Routine prompts (time-based) ──────────────────────────────────────
  const phq9Days = daysSince(latestFor("PHQ-9"));
  if (phq9Days === null || phq9Days >= ROUTINE_INTERVAL_DAYS) {
    prompts.push({
      instrument: "PHQ-9",
      reason: phq9Days === null
        ? "Set a baseline for your mood — a PHQ-9 takes 2 minutes, so later check-ins can show how things trend."
        : `It's been ${phq9Days} days since your last PHQ-9. Regular check-ins help you spot patterns.`,
      priority: "low",
      kind: "routine",
      firstTime: phq9Days === null,
    });
  }

  const who5Days = daysSince(latestFor("WHO-5"));
  if (who5Days === null || who5Days >= ROUTINE_INTERVAL_DAYS) {
    prompts.push({
      instrument: "WHO-5",
      reason: who5Days === null
        ? "A WHO-5 wellbeing check takes 2 minutes and sets a baseline your future check-ins can build on."
        : `Your fortnightly wellbeing check is due. Last one was ${who5Days} days ago.`,
      priority: "low",
      kind: "routine",
      firstTime: who5Days === null,
    });
  }

  // ── Contextual prompts (signal-based) ──────────────────────────────────
  // Elevation signal → suggest ASRM (mania screening)
  const elevation = emaElevationSignal();
  if (elevation !== "none") {
    const asrmDays = daysSince(latestFor("ASRM"));
    if (asrmDays === null || asrmDays >= 7) {
      prompts.push({
        instrument: "ASRM",
        reason: "Your energy has been rising recently. An ASRM takes 1 minute and helps you track whether this feels like a natural lift or something to watch.",
        priority: "high",
        kind: "contextual",
        firstTime: asrmDays === null,
      });
    }
  }

  // Inflection (deterioration) → suggest PHQ-9
  const inflection = topFireableSignal();
  if (inflection?.direction === "deterioration") {
    const phq9DaysSince = daysSince(latestFor("PHQ-9"));
    if (phq9DaysSince === null || phq9DaysSince >= 3) {
      prompts.push({
        instrument: "PHQ-9",
        reason: "Things seem to be shifting. A quick PHQ-9 can help you track where you are right now.",
        priority: "medium",
        kind: "contextual",
        firstTime: phq9DaysSince === null,
      });
    }
  }

  // Short sleep → suggest ASRM (bipolar prodrome)
  const sleepSignal = selfReportSleepSignal();
  if (sleepSignal?.firing) {
    const asrmDays = daysSince(latestFor("ASRM"));
    if (asrmDays === null || asrmDays >= 3) {
      prompts.push({
        instrument: "ASRM",
        reason: "Your sleep has been shorter recently. When sleep drops, it's worth checking in on how you're feeling — an ASRM takes 1 minute.",
        priority: "medium",
        kind: "contextual",
        firstTime: asrmDays === null,
      });
    }
  }

  // Sort by priority (high first)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  prompts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return prompts;
}

/**
 * Get the single most important assessment prompt (if any).
 * Returns null if nothing to suggest.
 */
export function getTopAssessmentPrompt(): AssessmentPrompt | null {
  const prompts = checkAssessmentPrompts();
  return prompts.length > 0 ? prompts[0] : null;
}

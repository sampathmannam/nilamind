import { selfReportSleepSignal } from "./sleepInsight";
import { loadMoodHistory } from "./moodHistory";
import { spotDistortions } from "./distortionSpotter";
import { detectElevationRisk } from "./elevationGuard";
import type { SleepSignal } from "./healthConnect";

export type JitaiTrigger =
  | "sleep_prodrome"
  | "mood_deterioration"
  | "high_distortion"
  | "elevation_risk"
  | "inactivity";

export interface JitaiDecision {
  shouldNudge: boolean;
  triggers: JitaiTrigger[];
  severity: "gentle" | "noticeable" | "urgent";
  nudgeText: string;
  suggestedTool: string | null;
}

const NUDGES: Record<JitaiTrigger, { text: string; tool: string | null; severity: "gentle" | "noticeable" | "urgent" }> = {
  sleep_prodrome: {
    text: "Your sleep has been short lately. A quick wind-down might help your body reset.",
    tool: "winddown",
    severity: "noticeable",
  },
  mood_deterioration: {
    text: "Things might be feeling heavier than usual. A check-in could help you notice what's shifting.",
    tool: null,
    severity: "noticeable",
  },
  high_distortion: {
    text: "I noticed some harsh self-talk patterns. Want to check the facts together?",
    tool: null,
    severity: "gentle",
  },
  elevation_risk: {
    text: "Some signs suggest things might be speeding up. A grounding exercise can help slow things down.",
    tool: "grounding",
    severity: "urgent",
  },
  inactivity: {
    text: "Haven't heard from you in a bit. No pressure, just checking in.",
    tool: null,
    severity: "gentle",
  },
};

export function assessJitai(params: {
  sleep: SleepSignal | null;
  moodHistory: ReturnType<typeof loadMoodHistory>;
  lastUserText?: string;
  daysSinceLastCheckin: number;
}): JitaiDecision {
  const triggers: JitaiTrigger[] = [];

  if (params.sleep?.firing) {
    triggers.push("sleep_prodrome");
  }

  const moods = params.moodHistory;
  if (moods.length >= 5) {
    const recent = moods.slice(-5);
    const intensities = recent.map((m) => m.intensity ?? 5);
    const avg = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const prev = moods.slice(-10, -5);
    const prevAvg = prev.length
      ? prev.map((m) => m.intensity ?? 5).reduce((a, b) => a + b, 0) / prev.length
      : avg;
    if (avg >= 6 && avg > prevAvg + 1) {
      triggers.push("mood_deterioration");
    }
  }

  if (params.lastUserText) {
    const distortions = spotDistortions(params.lastUserText);
    if (distortions.length >= 2) {
      triggers.push("high_distortion");
    }
  }

  if (params.lastUserText) {
    const elevation = detectElevationRisk(params.lastUserText);
    if (elevation.level !== "none") {
      triggers.push("elevation_risk");
    }
  }

  if (params.daysSinceLastCheckin >= 3) {
    triggers.push("inactivity");
  }

  if (triggers.length === 0) {
    return {
      shouldNudge: false,
      triggers: [],
      severity: "gentle",
      nudgeText: "",
      suggestedTool: null,
    };
  }

  const decisions = triggers.map((t) => NUDGES[t]);
  const maxSeverity = decisions.some((d) => d.severity === "urgent")
    ? "urgent"
    : decisions.some((d) => d.severity === "noticeable")
    ? "noticeable"
    : "gentle";

  const primary = decisions[0];
  const nudgeText = primary.text;
  const suggestedTool = primary.tool;

  return {
    shouldNudge: true,
    triggers,
    severity: maxSeverity as "gentle" | "noticeable" | "urgent",
    nudgeText,
    suggestedTool,
  };
}

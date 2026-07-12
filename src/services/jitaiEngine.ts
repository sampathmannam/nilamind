import { selfReportSleepSignal } from "./sleepInsight";
import { loadMoodHistory } from "./moodHistory";
import { safeSpotDistortions } from "./distortionSpotter"; // 🟡 Safety: Jitai now uses §9‑gated distortion check, needs review
import { detectElevationRisk } from "./elevationGuard";
import type { SleepSignal } from "./healthConnect";
import type { UsageSummary } from "./usageAnalytics";

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
  /** Recommended protocol id based on detected patterns, or null if none fits. */
  protocolRecommendation: string | null;
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

/** Pick a protocol recommendation based on current triggers + usage pattern. */
function recommendProtocol(
  triggers: JitaiTrigger[],
  lastUserText: string | undefined,
  usageAnalytics: UsageSummary | undefined,
): string | null {
  if (!usageAnalytics || usageAnalytics.totalCheckins < 3) return null;

  const text = (lastUserText || "").toLowerCase();
  const features = usageAnalytics.features;

  // Emotion dysregulation pattern → recommend DBT skills
  if (
    triggers.includes("mood_deterioration") ||
    text.match(/intense|overwhelming|can't cope|cant cope|outburst|explosive|mood swing/i)
  ) {
    if (!features.includes("values_snapshot") || !features.includes("diary_cards")) {
      return "dbt-skills-training";
    }
  }

  // Stuck/avoidance/rumination pattern → recommend ACT
  if (
    triggers.includes("high_distortion") ||
    text.match(/stuck|avoid|ruminat|overthink|fighting|can't accept|cant accept/i)
  ) {
    if (!features.includes("episode_records")) {
      return "act-training";
    }
  }

  return null;
}

/** Pick a personalised nudge text when usage data is available. */
function personaliseNudge(
  trigger: JitaiTrigger,
  base: string,
  usageAnalytics: UsageSummary | undefined,
): string {
  if (!usageAnalytics || usageAnalytics.totalCheckins < 3) return base;

  const features = usageAnalytics.features;

  if (trigger === "inactivity") {
    if (features.includes("values_snapshot")) {
      return "It's been a while — your Values Compass snapshot might be worth revisiting. What matters to you right now?";
    }
    if (usageAnalytics.checkinFrequency > 0.5) {
      return "You've been checking in regularly — a quick mood check keeps your trend going. How's your day been?";
    }
  }

  if (trigger === "mood_deterioration" && features.includes("values_snapshot")) {
    return "Things feel heavier — and that can pull you away from what matters. A values check-in might help reconnect.";
  }

  if (trigger === "high_distortion" && usageAnalytics.topEmotion === "anxious") {
    return "Anxiety has been common for you. When harsh self-talk shows up, checking the facts can loosen its grip.";
  }

  return base;
}

export function assessJitai(params: {
  sleep: SleepSignal | null;
  moodHistory: ReturnType<typeof loadMoodHistory>;
  lastUserText?: string;
  daysSinceLastCheckin: number;
  usageAnalytics?: UsageSummary;
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
    const safe = safeSpotDistortions(params.lastUserText);
    if (safe.ok && safe.matches.length >= 2) {
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
      protocolRecommendation: null,
    };
  }

  const decisions = triggers.map((t) => NUDGES[t]);
  const maxSeverity = decisions.some((d) => d.severity === "urgent")
    ? "urgent"
    : decisions.some((d) => d.severity === "noticeable")
    ? "noticeable"
    : "gentle";

  const primary = decisions[0];
  const nudgeText = personaliseNudge(triggers[0], primary.text, params.usageAnalytics);
  const suggestedTool = primary.tool;
  const protocolRecommendation = recommendProtocol(triggers, params.lastUserText, params.usageAnalytics);

  return {
    shouldNudge: true,
    triggers,
    severity: maxSeverity as "gentle" | "noticeable" | "urgent",
    nudgeText,
    suggestedTool,
    protocolRecommendation,
  };
}

// Phase 22.1 — Multi-signal compound analysis for passive sensing.
// 5 research-grounded detection rules that correlate signals across domains.
// Pure functions — no side effects. The core intelligence layer.

import type { DailyFeatureSet } from "./signalExtractor";

export interface CompoundSignal {
  id: string;
  kind: "risk" | "protective" | "insight";
  source: string[];
  label: string;
  detail: string;
  strength: "weak" | "moderate" | "strong";
  basis: string;
  confidence: number;
  suggestedAction: "nudge" | "card" | "silent" | "context_only";
}

/**
 * Rule 1: Activity prodrome — screen time spike + short sleep run.
 * Research: Ortiz et al. 2025 (N=127, 7-day activity advance as earliest prodrome).
 */
function detectActivityProdrome(window: DailyFeatureSet[]): CompoundSignal | null {
  const recent = window.slice(-3);
  if (recent.length < 2) return null;

  const shortSleepDays = recent.filter((f) => f.sleep.shortSleepRun >= 2).length;
  const spikeDays = recent.filter((f) => f.composite.activitySpike).length;

  if (shortSleepDays >= 2 && spikeDays >= 1) {
    const confidence = Math.min(1, (shortSleepDays + spikeDays) / recent.length);
    return {
      id: "activity-prodrome",
      kind: "risk",
      source: ["sleep", "activity"],
      label: "Activity pattern shift",
      detail: "Reduced sleep combined with increased phone activity — a pattern that sometimes precedes feeling wired.",
      strength: confidence > 0.7 ? "strong" : "moderate",
      basis: "Ortiz et al. 2025: activity variability as earliest prodrome signal, 7-day advance",
      confidence,
      suggestedAction: "card",
    };
  }
  return null;
}

/**
 * Rule 2: Circadian disintegration — sleep timing variability + phone usage circadian shift.
 * Research: BiAffect 2018 (phone usage as behavioral clock proxy).
 */
function detectCircadianDisintegration(window: DailyFeatureSet[]): CompoundSignal | null {
  if (window.length < 5) return null;

  const recent = window.slice(-5);
  const disruptionDays = recent.filter((f) => f.composite.circadianDisruption).length;

  if (disruptionDays >= 3) {
    const confidence = disruptionDays / recent.length;
    return {
      id: "circadian-disintegration",
      kind: "risk",
      source: ["circadian", "sleep"],
      label: "Routine disruption",
      detail: "Daily rhythm has been less consistent — sleep and phone usage timing are shifting.",
      strength: confidence > 0.8 ? "strong" : "moderate",
      basis: "BiAffect 2018: phone usage circadian patterns as behavioral clock proxy",
      confidence,
      suggestedAction: "card",
    };
  }
  return null;
}

/**
 * Rule 3: Withdrawal cascade — decreasing social app time + decreasing screen time + mood decline.
 * Research: Currey & Torous 2024 (home-time deviation as prodrome).
 */
function detectWithdrawalCascade(window: DailyFeatureSet[]): CompoundSignal | null {
  if (window.length < 5) return null;

  const recent = window.slice(-5);
  const baseline = window.slice(0, -5); // the user's own prior norm

  // Social decline is measured against the user's OWN baseline, not an absolute floor — otherwise a
  // person who simply never uses social apps reads as "withdrawing" every single day. Requires an
  // established baseline (avg >= 15 min) and recent days dropping below half of it.
  const baseSocial = baseline
    .map((f) => f.activity.socialAppMinutes)
    .filter((v): v is number => v != null);
  const baseSocialAvg = baseSocial.length ? baseSocial.reduce((a, b) => a + b, 0) / baseSocial.length : null;
  const socialDecline = baseSocialAvg != null && baseSocialAvg >= 15
    ? recent.filter((f) => f.activity.socialAppMinutes != null && f.activity.socialAppMinutes < baseSocialAvg * 0.5).length
    : 0;
  const screenDecline = recent.filter((f) => f.activity.screenTimeDelta7d != null && f.activity.screenTimeDelta7d < -30).length;

  if (socialDecline >= 3 && screenDecline >= 2) {
    const confidence = (socialDecline + screenDecline) / (recent.length * 2);
    return {
      id: "withdrawal-cascade",
      kind: "risk",
      source: ["activity", "circadian"],
      label: "Reduced engagement",
      detail: "Phone usage and social activity have been lower than usual — sometimes this means withdrawal.",
      strength: confidence > 0.6 ? "moderate" : "weak",
      basis: "Currey & Torous 2024: reduced mobility/social as mood episode prodrome",
      confidence,
      suggestedAction: "nudge",
    };
  }
  return null;
}

/**
 * Rule 4: Typing-motor concordance — fast typing + screen time spike + short sleep.
 * Research: BiAffect 2018 (keystroke dynamics R²=0.34-0.40 for mood prediction).
 */
function detectTypingMotorConcordance(window: DailyFeatureSet[]): CompoundSignal | null {
  const recent = window.slice(-3);
  if (recent.length < 2) return null;

  const elevationDays = recent.filter(
    (f) => f.composite.typingElevationSignal || (f.composite.activitySpike && f.sleep.shortSleepRun >= 2)
  ).length;

  if (elevationDays >= 2) {
    const confidence = elevationDays / recent.length;
    return {
      id: "typing-motor-concordance",
      kind: "risk",
      source: ["typing", "activity", "sleep"],
      label: "Elevated pattern",
      detail: "Typing speed, phone activity, and sleep have been elevated together — a combined pattern.",
      strength: confidence > 0.7 ? "strong" : "moderate",
      basis: "BiAffect 2018: keystroke dynamics predict mood disturbance severity",
      confidence,
      suggestedAction: "card",
    };
  }
  return null;
}

/**
 * Rule 5: Resilience cluster — good sleep regularity + consistent activity + stable typing.
 * Research: protective patterns from multiple domains.
 */
function detectResilienceCluster(window: DailyFeatureSet[]): CompoundSignal | null {
  if (window.length < 5) return null;

  const recent = window.slice(-5);
  const goodSleep = recent.filter((f) => f.sleep.hoursLastNight != null && f.sleep.hoursLastNight >= 6.5 && f.sleep.shortSleepRun === 0).length;
  const stableActivity = recent.filter((f) => f.activity.screenTimeDelta7d != null && Math.abs(f.activity.screenTimeDelta7d) < 30).length;
  const noElevation = recent.filter((f) => !f.composite.typingElevationSignal && !f.composite.activitySpike).length;

  if (goodSleep >= 4 && stableActivity >= 3 && noElevation >= 4) {
    const confidence = (goodSleep + stableActivity + noElevation) / (recent.length * 3);
    return {
      id: "resilience-cluster",
      kind: "protective",
      source: ["sleep", "activity", "typing"],
      label: "Steady week",
      detail: "Sleep, activity, and routine have been consistent — that kind of stability quietly helps.",
      strength: confidence > 0.8 ? "strong" : "moderate",
      basis: "Multiple domains: sleep regularity + activity consistency + stable typing",
      confidence,
      suggestedAction: "card",
    };
  }
  return null;
}

/** Detect compound signals from a feature window. Pure — no side effects. */
export function detectCompoundSignals(
  window: DailyFeatureSet[],
  _currentMood?: { intensity: number; emotion: string } | null,
): CompoundSignal[] {
  const signals: CompoundSignal[] = [];

  const s1 = detectActivityProdrome(window);
  if (s1) signals.push(s1);

  const s2 = detectCircadianDisintegration(window);
  if (s2) signals.push(s2);

  const s3 = detectWithdrawalCascade(window);
  if (s3) signals.push(s3);

  const s4 = detectTypingMotorConcordance(window);
  if (s4) signals.push(s4);

  const s5 = detectResilienceCluster(window);
  if (s5) signals.push(s5);

  return signals;
}

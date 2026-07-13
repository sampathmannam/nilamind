/**
 * disengagementPredictor.ts — early disengagement risk assessment
 *
 * Based on Roos & Werth (2019, Internet Interventions): engagement velocity/
 * decay in ecological momentary interventions, and Beatty & Binnion (2016,
 * J Med Internet Res): 74% attrition in unguided iCBT, predicted by early
 * adherence patterns.
 *
 * Rather than waiting for N days of inactivity (reactive threshold), this
 * module computes a continuous risk score from multiple signals, detecting
 * engagement *velocity* — the rate at which engagement is declining — so that
 * re-engagement can happen earlier and more precisely.
 *
 * All data read from secureLocal — no network, no user-facing questionnaire.
 */
import { secureLocal } from "./secureLocal";

export interface DisengagementSignal {
  name: string;
  weight: number;
  contributing: boolean;
  detail: string;
}

export interface DisengagementRisk {
  riskLevel: "low" | "moderate" | "elevated" | "high";
  /** 0–100 composite risk score. */
  score: number;
  signals: DisengagementSignal[];
  daysSinceLastCheckin: number;
  frequencyTrend: "declining" | "stable" | "improving" | "insufficient_data";
}

export interface DisengagementParams {
  checkinDates: string[];
  appOpenDays: string[];
  protocolAdherenceRate: number;
  allianceTrend: string;
  daysSinceLastCheckin: number;
  daysSinceLastAppOpen: number;
  protocolCount: number;
  featureCount: number;
}

/* ── Core assessment ──────────────────────────────────────── */

export function assessDisengagementRisk(
  params: DisengagementParams,
  _nowIso?: string,
): DisengagementRisk {
  const signals: DisengagementSignal[] = [];
  let totalScore = 0;
  let maxPossible = 0;

  // 1. check-in recency (0–30 points)
  // Within 1 day = 0. 2 days = 5. 3-6 days = 15. 7-13 = 25. 14+ = 30.
  {
    const d = params.daysSinceLastCheckin;
    let points = 0;
    if (d >= 14) points = 30;
    else if (d >= 7) points = 25;
    else if (d >= 3) points = 15;
    else if (d >= 2) points = 5;
    maxPossible += 30;
    totalScore += points;
    signals.push({
      name: "checkin_recency",
      weight: 30,
      contributing: points > 0,
      detail: points > 0
        ? `${d} day${d === 1 ? "" : "s"} since last check-in`
        : "Checked in today or yesterday",
    });
  }

  // 2. app-open recency (0–15 points)
  {
    const d = params.daysSinceLastAppOpen;
    let points = 0;
    if (d >= 7) points = 15;
    else if (d >= 3) points = 10;
    else if (d >= 2) points = 5;
    maxPossible += 15;
    totalScore += points;
    signals.push({
      name: "app_open_recency",
      weight: 15,
      contributing: points > 0,
      detail: points > 0
        ? `${d} day${d === 1 ? "" : "s"} since last app open`
        : "App opened today or yesterday",
    });
  }

  // 3. check-in frequency trend over 28d (0–20 points)
  {
    const trend = computeFrequencyTrend(params.checkinDates);
    let points = 0;
    if (trend === "declining") points = 20;
    else if (trend === "stable") points = 5;
    maxPossible += 20;
    totalScore += points;
    signals.push({
      name: "frequency_trend",
      weight: 20,
      contributing: trend === "declining",
      detail: trend === "declining"
        ? "Check-in frequency is decreasing over the last 4 weeks"
        : trend === "stable"
        ? "Check-in frequency is stable"
        : trend === "improving"
        ? "Check-in frequency is improving"
        : "Not enough data to determine trend",
    });
  }

  // 4. protocol adherence rate (0–15 points) — poor adherence = higher risk
  {
    const rate = params.protocolAdherenceRate;
    let points = 0;
    // Only penalize if they've actually started protocols (no data = no signal)
    if (params.protocolCount > 0) {
      if (rate < 0.3) points = 15;
      else if (rate < 0.6) points = 8;
      else if (rate < 1) points = 3;
    }
    maxPossible += 15;
    totalScore += points;
    signals.push({
      name: "protocol_adherence",
      weight: 15,
      contributing: points >= 8,
      detail: points >= 8
        ? `Low protocol completion rate (${Math.round(rate * 100)}%)`
        : params.protocolCount === 0
        ? "No protocols started yet"
        : `Protocol completion rate ${Math.round(rate * 100)}%`,
    });
  }

  // 5. alliance trend (0–10 points)
  {
    let points = 0;
    if (params.allianceTrend === "declining") points = 10;
    else if (params.allianceTrend === "stable") points = 3;
    maxPossible += 10;
    totalScore += points;
    signals.push({
      name: "alliance_trend",
      weight: 10,
      contributing: points >= 10,
      detail: params.allianceTrend === "declining"
        ? "Therapeutic alliance proxy is declining"
        : `Alliance trend: ${params.allianceTrend}`,
    });
  }

  // 6. feature adoption breadth (0–5 points) — narrow = higher risk
  {
    const count = params.featureCount;
    let points = 0;
    if (count <= 1) points = 5;
    else if (count <= 3) points = 3;
    maxPossible += 5;
    totalScore += points;
    signals.push({
      name: "feature_breadth",
      weight: 5,
      contributing: points >= 3,
      detail: points >= 3
        ? `Using only ${count} feature${count === 1 ? "" : "s"}`
        : `Using ${count} features`,
    });
  }

  // 7. protocol count (0–5 points) — no protocols started = higher risk
  {
    const count = params.protocolCount;
    let points = 0;
    if (count === 0) points = 5;
    else if (count === 1) points = 2;
    maxPossible += 5;
    totalScore += points;
    signals.push({
      name: "protocol_engagement",
      weight: 5,
      contributing: points >= 2,
      detail: count === 0
        ? "No structured programs started yet"
        : `${count} program${count === 1 ? "" : "s"} started`,
    });
  }

  const score = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

  let riskLevel: DisengagementRisk["riskLevel"] = "low";
  if (score >= 70) riskLevel = "high";
  else if (score >= 45) riskLevel = "elevated";
  else if (score >= 25) riskLevel = "moderate";

  const frequencyTrend = computeFrequencyTrend(params.checkinDates);

  return {
    riskLevel,
    score,
    signals,
    daysSinceLastCheckin: params.daysSinceLastCheckin,
    frequencyTrend,
  };
}

/* ── Frequency trend analysis ─────────────────────────────── */

function computeFrequencyTrend(
  checkinDates: string[],
): "declining" | "stable" | "improving" | "insufficient_data" {
  if (checkinDates.length < 4) return "insufficient_data";

  const sorted = [...new Set(checkinDates)].sort();
  const now = Date.now();
  const DAY_MS = 86400000;
  const recentCutoff = now - 14 * DAY_MS;
  const olderCutoff = now - 28 * DAY_MS;

  const recent = sorted.filter((d) => {
    const t = new Date(d + "T00:00:00").getTime();
    return t >= recentCutoff && t < now;
  });
  const older = sorted.filter((d) => {
    const t = new Date(d + "T00:00:00").getTime();
    return t >= olderCutoff && t < recentCutoff;
  });

  if (recent.length < 2 || older.length < 2) return "insufficient_data";

  const recentRate = recent.length / 14;
  const olderRate = older.length / 14;

  if (recentRate >= olderRate * 1.2) return "improving";
  if (recentRate <= olderRate * 0.8) return "declining";
  return "stable";
}

/* ── Context block for Nila ───────────────────────────────── */

export function getDisengagementContextBlock(
  params: DisengagementParams,
  nowIso?: string,
): string {
  const risk = assessDisengagementRisk(params, nowIso);
  if (risk.riskLevel === "low") return "";

  const parts: string[] = ["ENGAGEMENT NOTE:"];
  if (risk.daysSinceLastCheckin >= 3) {
    parts.push(`Their last check-in was ${risk.daysSinceLastCheckin} days ago.`);
  }
  if (risk.frequencyTrend === "declining") {
    parts.push("Their check-in frequency has been declining over the last 4 weeks.");
  }
  parts.push(`Risk level: ${risk.riskLevel}.`);
  parts.push("Be gently encouraging if they mention using the app — never scold or guilt.");
  parts.push("Never pressure. Warmth, not nagging.");

  return parts.join(" ");
}

/**
 * Guided Chain Analysis (Feature 5 / Phase D).
 *
 * Evidence: Linehan 2015 (chain analysis worksheet), Neacsiu et al. 2014,
 * Ritschel et al. 2015 (reduces emotion dysregulation).
 *
 * Pure service — no React, no side-effects. Screen owns persistence.
 */

import type { ElevationLevel } from "./elevationGuard";
import { energyElevationSignal, napElevationSignal } from "./elevationGuard";
import { emaElevationSignal } from "./ema";
import { chatElevationSignal } from "./chatElevation";
import { selfReportSleepSignal } from "./sleepInsight";
import { loadCheckins } from "./checkin";
import { localDateKey } from "./storageUtils";

// Same none < elevated < high ranking modeEngine.ts uses to fold multiple elevation sources into one
// UserState — duplicated locally (not imported from modeEngine.ts) to keep this a leaf service with no
// dependency on the mode/UI-adaptation layer.
const ELEVATION_RANK: Record<ElevationLevel, number> = { none: 0, elevated: 1, high: 2 };
function highestElevation(...levels: ElevationLevel[]): ElevationLevel {
  return levels.reduce((best, l) => (ELEVATION_RANK[l] > ELEVATION_RANK[best] ? l : best), "none" as ElevationLevel);
}

export interface ChainLink {
  /** Free-text: what happened at this moment */
  moment: string;
  thought?: string;
  emotion?: string;
  sensation?: string;
  action?: string;
}

export interface VulnerabilityFactors {
  sleepProdrome: boolean;
  elevationLevel: "none" | "elevated" | "high";
  checkinDistress: number;       // 0 = none recorded
  elevatedHours: number;         // hours in elevated state today
  other: string[];
}

export interface InterventionPlan {
  /** Index into chainLinks where the user would intervene */
  linkIndex: number;
  /** Which DBT skill family to use */
  skillId: string;
  /** Free-text plan */
  plan: string;
}

export interface ChainAnalysis {
  id: string;
  date: string;
  vulnerability: VulnerabilityFactors;
  promptingEvent: string;
  chainLinks: ChainLink[];
  behavior: string;
  consequences: string;
  interventionPoint?: InterventionPlan;
}

/**
 * Build the default vulnerability snapshot from deterministic on-device reads. Called when the user
 * opens a new chain analysis — every field is still user-EDITABLE in the screen (a prefill, not a
 * verdict), matching the sense->ask->confirm pattern the rest of the app uses for inferred state.
 * No LLM involvement.
 */
export function prefillVulnerability(): VulnerabilityFactors {
  let sleepProdrome = false;
  try {
    sleepProdrome = selfReportSleepSignal()?.firing ?? false;
  } catch { /* best-effort — a read failure just means the checkbox starts unchecked */ }

  let elevationLevel: ElevationLevel = "none";
  try {
    elevationLevel = highestElevation(
      emaElevationSignal(),
      chatElevationSignal(),
      energyElevationSignal(),
      napElevationSignal(),
    );
  } catch { /* best-effort — starts at "none", still user-selectable */ }

  let checkinDistress = 0;
  let elevatedHours = 0;
  try {
    const today = localDateKey();
    const todaysCheckins = loadCheckins().filter((c) => c.date === today);
    if (todaysCheckins.length) {
      const latest = todaysCheckins[todaysCheckins.length - 1];
      checkinDistress = typeof latest.intensity === "number" ? latest.intensity : 0;
    }
    // No direct "hours in an elevated state today" tracker exists anywhere in the app (elevation
    // signals are level-only, not duration-stamped) -- this is a deliberately rough proxy: hours since
    // local midnight, but only counted when a signal is CURRENTLY elevated, so a calm day never reports
    // false vulnerability hours.
    if (elevationLevel !== "none") {
      const now = new Date();
      elevatedHours = Math.round((now.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 3_600_000);
    }
  } catch { /* best-effort */ }

  return {
    sleepProdrome,
    elevationLevel,
    checkinDistress,
    elevatedHours,
    other: [],
  };
}

let _seq = 0;

/**
 * Generate a unique id for a chain analysis entry. Timestamp + sequence for
 * guaranteed uniqueness even within the same millisecond.
 */
export function chainId(): string {
  return `chain_${Date.now()}_${++_seq}`;
}

/**
 * Suggest a DBT skill family based on the emotion in a chain link.
 * Pure lookup — no randomness.
 */
export function suggestSkillForEmotion(emotion?: string): string | undefined {
  if (!emotion) return undefined;
  const e = emotion.toLowerCase();
  if (["furious", "angry", "irritated", "seething", "explosive"].some((w) => e.includes(w))) return "distress_tolerance";
  if (["anxious", "panicked", "worried", "overwhelmed", "tense"].some((w) => e.includes(w))) return "emotion_regulation";
  if (["sad", "empty", "numb", "hopeless", "drained"].some((w) => e.includes(w))) return "emotion_regulation";
  if (["ashamed", "guilty", "worthless", "humiliated"].some((w) => e.includes(w))) return "distress_tolerance";
  if (["grateful", "calm", "peaceful", "connected"].some((w) => e.includes(w))) return "mindfulness";
  return undefined;
}

/**
 * Summarise a chain analysis into a single-paragraph digest for the chat coach.
 * Pure — no network calls.
 */
export function summariseChain(chain: ChainAnalysis): string {
  const parts: string[] = [];

  if (chain.vulnerability.elevationLevel !== "none") {
    parts.push(`Elevated state (${chain.vulnerability.elevationLevel})`);
  }
  if (chain.vulnerability.sleepProdrome) parts.push("sleep prodrome present");
  if (chain.vulnerability.checkinDistress > 3) {
    parts.push(`check-in distress ${chain.vulnerability.checkinDistress}/10`);
  }

  const events = chain.chainLinks.filter((l) => l.moment.trim());
  if (events.length > 0) {
    parts.push(`${events.length} chain links`);
  }

  if (chain.interventionPoint) {
    parts.push(
      `intervention at link ${chain.interventionPoint.linkIndex + 1} using ${chain.interventionPoint.skillId}`,
    );
  }

  return parts.length > 0 ? parts.join("; ") : "Chain analysis recorded";
}

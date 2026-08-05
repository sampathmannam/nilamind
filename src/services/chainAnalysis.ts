/**
 * Guided Chain Analysis (Feature 5 / Phase D).
 *
 * Evidence: Linehan 2015 (chain analysis worksheet), Neacsiu et al. 2014,
 * Ritschel et al. 2015 (reduces emotion dysregulation).
 *
 * Pure service — no React, no side-effects. Screen owns persistence.
 */

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
 * Build the default vulnerability snapshot from deterministic on-device reads.
 * Called when the user opens a new chain analysis. No LLM involvement.
 */
export function prefillVulnerability(): VulnerabilityFactors {
  return {
    sleepProdrome: false,
    elevationLevel: "none",
    checkinDistress: 0,
    elevatedHours: 0,
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

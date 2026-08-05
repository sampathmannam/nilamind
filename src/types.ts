export interface CheckInEntry {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  emotion: string;
  intensity: number; // 1-10
  energy?: number | null; // 1-4 (Very low / Low / Moderate / High) — optional for backward compat
  context: string;
  sleepHours?: number; // External factor: 0-24
  socialInteraction?: number; // External factor: 1-10 (1: isolated, 10: highly connected)
  granularEmotion?: string; // Fine-grained emotion label (e.g. "Betrayed" vs just "Angry")
}

/** One DBT-style target-behavior urge rating for a day (Linehan diary card's core "life-threatening
 *  behaviors" tier). Purely self-report — logging a rating, even a high one, never triggers any
 *  live intervention; that's the point of a diary card (honest tracking without alarm). */
export interface DiaryUrge {
  key: string; // e.g. "selfHarm", "suicidal", "substanceUse", or a user-added custom key
  label: string;
  intensity: number; // 0-5, 0 = no urge
  actedOn: boolean;
}

/** Effectiveness of a DBT skill actually tried that day — simplified from the official 0-7 Linehan
 *  scale to a 3-state tap (unrated -> tried, didn't help -> tried, helped) to keep entry low-friction. */
export type SkillEffectiveness = "tried_no_help" | "tried_helped";

export interface DiaryCardEntry {
  date: string; // YYYY-MM-DD
  emotions: {
    misery: number;
    shame: number;
    anger: number;
    fear: number;
    joy: number;
    love: number;
  };
  skillsUsed: string[];
  /** Effectiveness per skill in skillsUsed. Optional for backward-compat reads of older entries
   *  (pre-redesign entries have skillsUsed but no effectiveness rating). */
  skillEffectiveness?: Record<string, SkillEffectiveness>;
  /** Target-behavior urge ratings for the day. Optional for backward-compat reads. */
  urges?: DiaryUrge[];
  quickNotes?: string;
  quickNoteTags?: string[];
  /** Emotion Differentiation chips from the discrete-label picker (Feature 6). Optional for backward-compat. */
  discreteEmotions?: string[];
  morningIntention?: string;
  /** Which journaling mode the quick note was written in. Optional for backward-compat reads. */
  journalMode?: "free" | "gratitude";
}

export interface SafetyPlan {
  warningSigns: string;
  internalCoping: string;
  socialDistractors: string;
  trustedPeople: string;
  professionals: string;
  safeEnvironment: string;
  /** Epoch ms of last update. Omitted on legacy plans (no follow-up until the user saves once). */
  lastUpdatedAt?: number;
  /** Epoch ms when 48h first follow-up was acknowledged/done. */
  firstFollowUpDoneAt?: number;
}

export interface EpisodeRecord {
  id: string;
  date: string;
  time: string;
  dayOfWeek: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  trigger: string | null;
  skillsHelpful: string[];
  startIntensity: number;
  peakIntensity: number;
  endIntensity: number;
  durationMinutes: number;
  humanContactPrompted: boolean;
  crisisLineShown: boolean;
}

export interface ThoughtRecord {
  id: string;
  date: string;
  situation: string;
  feeling: string;
  initialIntensity: number; // 1-100
  automaticThought: string;
  beliefPercent: number; // 0-100
  thinkingTraps: string[];
  balancedThought: string;
  reRatedIntensity: number; // 1-100
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD, for date-header grouping
  timestamp: string; // ISO, for feed ordering + time-of-day display
  mode: "free" | "gratitude";
  text: string;
  valence?: number; // -3..+3, same scale as EmaEntry — omitted if the user skipped the mood tap
  energy?: number; // 1-4, same scale as EmaEntry
}

export interface EmaEntry {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO
  /** Valence: -3 (very bad) to +3 (very good). 0 = neutral. */
  valence: number;
  /** Energy: 1-4 (very low / low / moderate / high). Optional on EMA. */
  energy?: number;
  /** Optional 1-3 word note. */
  note?: string;
  /** What triggered this check-in. */
  trigger: "random" | "user_initiated";
}

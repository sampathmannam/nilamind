export interface CheckInEntry {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  emotion: string;
  intensity: number; // 1-10
  context: string;
  sleepHours?: number; // External factor: 0-24
  socialInteraction?: number; // External factor: 1-10 (1: isolated, 10: highly connected)
  granularEmotion?: string; // Fine-grained emotion label (e.g. "Betrayed" vs just "Angry")
}

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
  quickNotes?: string;
  quickNoteTags?: string[];
  morningIntention?: string;
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

export interface CriticEntry {
  id: string;
  date: string;
  criticalVoice: string;
  trigger: string;
  friendResponse: string;
}

export interface CompassionateLetter {
  id: string;
  date: string;
  content: string;
}

export interface ShameReflectEntry {
  id: string;
  date: string;
  shameName: string;
  shameOrigin: string;
  shameProtection: string;
  kinderView: string;
}

/** Ecological Momentary Assessment — a micro-check-in (<10s). Multiple per day. */
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

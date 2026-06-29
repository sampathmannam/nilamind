export interface CheckInEntry {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  emotion: string;
  intensity: number; // 1-10
  context: string;
  sleepHours?: number; // External factor: 0-24
  socialInteraction?: number; // External factor: 1-10 (1: isolated, 10: highly connected)
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

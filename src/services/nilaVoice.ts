// Nila's Voice — companion personality response templates.
// The 1B model can't generate warm, empathetic responses on its own.
// These templates provide the warmth and personality; the model fills in personal details.
// Every response follows the companion voice guidelines:
// - Warm but not saccharine
// - Curious but not interrogating
// - Grounded but not clinical
// - Honest but not harsh
// - Companion, not therapist

export type VoiceScenario =
  | "greeting"
  | "mood_low"
  | "mood_moderate"
  | "mood_good"
  | "mood_high_distress"
  | "sleep_short"
  | "sleep_good"
  | "streak_milestone"
  | "returning_after_absence"
  | "crisis_detected"
  | "after_episode"
  | "tool_suggestion"
  | "checkin_prompt"
  | "wind_down"
  | "morning_greeting"
  | "evening_greeting"
  | "general_support";

interface VoiceTemplate {
  templates: string[];
  /** Whether this scenario should be wrapped around the model's response or used standalone. */
  standalone?: boolean;
}

const VOICE_TEMPLATES: Record<VoiceScenario, VoiceTemplate> = {
  greeting: {
    templates: [
      "Hey — I'm here whenever you need me.",
      "Good to see you. How are you doing?",
      "I'm here. What's on your mind?",
    ],
  },
  mood_low: {
    templates: [
      "I hear you — things have been heavy lately. That takes a toll.",
      "Tough days are exhausting. You're still showing up, and that matters.",
      "I notice things have been harder recently. You don't have to carry this alone.",
    ],
  },
  mood_moderate: {
    templates: [
      "Mixed days can be confusing — some up, some down. That's real.",
      "You're navigating a lot. Having ups and downs is human.",
      "Things seem unsettled right now. That's okay — it won't last forever.",
    ],
  },
  mood_good: {
    templates: [
      "That's good to hear. What do you think helped?",
      "I'm glad today is better. Notice what's different — it might matter.",
      "A good day is worth noticing. What's going well?",
    ],
  },
  mood_high_distress: {
    templates: [
      "I'm here with you. You don't have to figure this out right now.",
      "That sounds really hard. Let's take this one moment at a time.",
      "I hear you. When things feel this heavy, even small steps count.",
    ],
  },
  sleep_short: {
    templates: [
      "Short sleep can make everything harder. Tonight might be a good night for the wind-down.",
      "Sleep changes everything. Even one better night can shift how you feel.",
      "I notice your sleep has been shorter. Your body might be asking for rest.",
    ],
  },
  sleep_good: {
    templates: [
      "Good sleep makes a real difference. Glad you're resting.",
      "Sleep is one of the most powerful things you can do for yourself. Keep it up.",
    ],
  },
  streak_milestone: {
    templates: [
      "You've been showing up consistently — that takes real commitment.",
      "Every day you check in, you're building something. Keep going.",
      "Consistency is a form of self-respect. You're doing it.",
    ],
  },
  returning_after_absence: {
    templates: [
      "Welcome back. No judgment — life happens. I'm glad you're here.",
      "It's been a little while. No pressure — just know I'm here.",
      "You came back. That's what matters. How are you?",
    ],
  },
  crisis_detected: {
    templates: [
      "I'm here. You're not alone. Let's breathe together.",
      "I hear you. When things feel this intense, it's okay to reach out for help.",
      "You don't have to go through this alone. There are people who want to help.",
    ],
    standalone: true,
  },
  after_episode: {
    templates: [
      "That took courage to log. Tracking helps you understand your patterns.",
      "Thank you for sharing that. Every piece of data helps you see the bigger picture.",
      "Logging episodes is an act of self-awareness. You're learning about yourself.",
    ],
  },
  tool_suggestion: {
    templates: [
      "Based on how you're feeling, this might help.",
      "I noticed something — want to try a tool that could work right now?",
      "This one's research-backed and takes just a few minutes.",
    ],
  },
  checkin_prompt: {
    templates: [
      "A quick check-in is just a tap or two. Want to log how you're doing?",
      "How are you right now? One tap to record it.",
      "Even a one-tap mood helps your patterns grow.",
    ],
  },
  wind_down: {
    templates: [
      "The day is done. Time to settle your body.",
      "Your wind-down steps are ready when you are.",
      "Let the day rest. You've done enough.",
    ],
  },
  morning_greeting: {
    templates: [
      "Good morning. How did you sleep?",
      "A new day — how are you starting?",
      "Morning. What's one thing you'd like to focus on today?",
    ],
  },
  evening_greeting: {
    templates: [
      "Evening. How was your day?",
      "The day's winding down — how are you feeling?",
      "Good evening. What stood out today?",
    ],
  },
  general_support: {
    templates: [
      "I'm here with you.",
      "You're doing better than you think.",
      "One step at a time. That's enough.",
    ],
  },
};

/**
 * Selects a template for the given scenario.
 * Uses a deterministic rotation based on the current day so the user sees variety
 * but doesn't get the same message every time.
 */
export function selectTemplate(scenario: VoiceScenario, seed?: number): string {
  const template = VOICE_TEMPLATES[scenario];
  if (!template || template.templates.length === 0) return "";
  const idx = (seed ?? Date.now()) % template.templates.length;
  return template.templates[idx];
}

/**
 * Returns the appropriate voice scenario based on the user's current state.
 * This is the main entry point for determining what tone Nila should use.
 */
export function detectScenario(context: {
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  recentMoodAvg: number | null;
  checkedInToday: boolean;
  streakDays: number;
  sleepHours: number | null;
  isCrisis: boolean;
  hasRecentEpisode: boolean;
  isReturning: boolean;
}): VoiceScenario {
  if (context.isCrisis) return "crisis_detected";
  if (context.hasRecentEpisode) return "after_episode";
  if (context.isReturning) return "returning_after_absence";
  if (context.streakDays >= 7 && !context.checkedInToday) return "streak_milestone";

  if (context.timeOfDay === "morning" && !context.checkedInToday) return "morning_greeting";
  if (context.timeOfDay === "evening" && !context.checkedInToday) return "evening_greeting";
  if (context.timeOfDay === "night") return "wind_down";

  if (context.sleepHours != null && context.sleepHours < 5) return "sleep_short";
  if (context.sleepHours != null && context.sleepHours >= 7) return "sleep_good";

  if (context.recentMoodAvg != null) {
    if (context.recentMoodAvg <= 3) return "mood_low";
    if (context.recentMoodAvg <= 5) return "mood_moderate";
    if (context.recentMoodAvg <= 7) return "mood_good";
    return "mood_high_distress";
  }

  if (!context.checkedInToday) return "checkin_prompt";
  return "general_support";
}

/**
 * Builds a warm, companion-tone message for the given context.
 * This is the main function to call from the UI.
 */
export function buildNilaMessage(context: {
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  recentMoodAvg: number | null;
  checkedInToday: boolean;
  streakDays: number;
  sleepHours: number | null;
  isCrisis: boolean;
  hasRecentEpisode: boolean;
  isReturning: boolean;
}, seed?: number): { message: string; scenario: VoiceScenario } {
  const scenario = detectScenario(context);
  const message = selectTemplate(scenario, seed);
  return { message, scenario };
}

/** Returns all available scenarios (for testing). */
export function getAllScenarios(): VoiceScenario[] {
  return Object.keys(VOICE_TEMPLATES) as VoiceScenario[];
}

/** Returns the number of templates for a scenario (for testing). */
export function getTemplateCount(scenario: VoiceScenario): number {
  return VOICE_TEMPLATES[scenario]?.templates.length ?? 0;
}

// Personal RAG — retrieves relevant personal data to warm and personalize responses.
// When someone says "I'm feeling anxious," retrieves: what helped before, recent mood patterns,
// relevant check-ins, and past skills used. This gives the 1.5B model specific, personal knowledge
// that makes responses feel like a friend who actually remembers, not an app reading data.

import { loadEpisodes } from "./episodes";
import { readEpisodeMarkers } from "./episodeMarker";
import { loadCheckins } from "./checkin";
import { loadMoodHistory } from "./moodHistory";
import { loadAssessments } from "./assessments";
import { detectEmotionUnified } from "./personaConfig";

export interface PersonalContext {
  /** What skills/techniques helped before for similar situations. */
  whatHelped: string[];
  /** Recent mood summary — how they've been feeling lately. */
  recentMood: string | null;
  /** Recent check-in highlights. */
  recentCheckins: string | null;
  /** Assessment scores that are relevant. */
  relevantAssessments: string | null;
  /** Episode markers related to current state. */
  relevantEpisodes: string | null;
}

// Keywords that indicate someone is open to receiving help/suggestions
const HELP_READY_KEYWORDS = [
  "help", "need", "want", "try", "open", "suggest", "what should", "what can",
  "how do i", "advice", "idea", "anything", "something",
];

// Emotion-to-skill mapping — what typically helps for each emotional state
const EMOTION_SKILL_MAP: Record<string, string[]> = {
  anxious: ["grounding", "breathing", "box breathing", "5-4-3-2-1", "TIPP temperature"],
  sad: ["behavioral activation", "opposite action", "values check", "gratitude", "walk"],
  angry: ["TIPP", "opposite action", "pause and breathe", "ice dive", "paced breathing"],
  numb: ["behavioral activation", "sensory grounding", "movement", "music", "touch"],
  hopeless: ["build mastery", "values to action", "one small thing", "connection"],
  lonely: ["connection", "reach out", "peer support", "social rhythm"],
  overwhelmed: ["grounding", "break it down", "problem solving", "one thing at a time"],
  stressed: ["paced breathing", "wind down", "boundaries", "prioritize", "rest"],
};

/**
 * Retrieve "what helped before" from the user's history.
 * Searches: episodes (skills used), diary entries, and check-in patterns.
 */
function retrieveWhatHelped(emotion: string): string[] {
  const helped: Set<string> = new Set();

  // From episodes: what skills were helpful
  try {
    const episodes = loadEpisodes();
    const recent = episodes.slice(-10);
    for (const ep of recent) {
      if (ep?.skillsHelpful && Array.isArray(ep.skillsHelpful)) {
        for (const skill of ep.skillsHelpful) {
          helped.add(String(skill));
        }
      }
    }
  } catch { /* best-effort */ }

  // From emotion-skill mapping: recommended skills for this emotion
  const recommended = EMOTION_SKILL_MAP[emotion] ?? [];
  for (const skill of recommended) {
    helped.add(skill);
  }

  return [...helped].slice(0, 4);
}

/**
 * Get recent mood summary.
 */
function getRecentMood(): string | null {
  try {
    const moods = loadMoodHistory();
    if (moods.length < 3) return null;

    const recent = moods.slice(-7);
    const intensities = recent
      .filter((m) => m.intensity != null)
      .map((m) => m.intensity!);

    if (intensities.length < 3) return null;

    const avg = intensities.reduce((s, v) => s + v, 0) / intensities.length;
    const latest = recent[recent.length - 1]?.intensity;

    if (avg <= 3) return "They've been feeling fairly steady lately (low distress).";
    if (avg <= 5) return "They've been having mixed days recently — some up, some down.";
    if (avg <= 7) return "They've been feeling higher distress recently — things have been harder.";
    return "They've been struggling — distress has been high lately.";

  } catch { return null; }
}

/**
 * Get recent check-in highlights.
 */
function getRecentCheckins(): string | null {
  try {
    const list = loadCheckins();
    if (list.length === 0) return null;

    const recent = list.slice(-5);
    const emotions = recent
      .filter((c: any) => c?.emotion)
      .map((c: any) => String(c.emotion).replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase());

    if (emotions.length < 2) return null;

    const counts: Record<string, number> = {};
    for (const e of emotions) counts[e] = (counts[e] || 0) + 1;

    const top = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([e]) => e);

    return `Over their last ${emotions.length} check-ins, they've mostly felt: ${top.join(", ")}.`;
  } catch { return null; }
}

/**
 * Get relevant assessment scores.
 */
function getRelevantAssessments(): string | null {
  try {
    const assessments = loadAssessments();
    if (assessments.length === 0) return null;

    const latestPhq9 = assessments
      .filter((a) => a.instrument === "PHQ-9")
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    const latestGad7 = assessments
      .filter((a) => a.instrument === "GAD-7")
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    const parts: string[] = [];
    if (latestPhq9) parts.push(`PHQ-9: ${latestPhq9.total}/27 (${latestPhq9.severity})`);
    if (latestGad7) parts.push(`GAD-7: ${latestGad7.total}/21 (${latestGad7.severity})`);

    return parts.length > 0 ? `Latest screenings: ${parts.join(", ")}.` : null;
  } catch { return null; }
}

/**
 * Get relevant episode markers.
 */
function getRelevantEpisodes(): string | null {
  try {
    const markers = readEpisodeMarkers();
    if (markers.length === 0) return null;

    const recent = markers.slice(-3);
    const phases = recent.map((m) => m.phase).join(", ");
    return `Recent episode phases: ${phases}.`;
  } catch { return null; }
}

/**
 * Detect the primary emotional context from the user message.
 * Delegates to the unified keyword matcher in personaConfig.
 */
function detectEmotionalContext(message: string): string {
  return detectEmotionUnified(message);
}

/**
 * Check if the user is open to receiving help/suggestions.
 */
function isOpenToHelp(message: string): boolean {
  const lower = message.toLowerCase();
  return HELP_READY_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Main RAG function — retrieves personal context for a user message.
 * Returns a warm, natural-language context block for the system prompt.
 */
export function retrievePersonalContext(userMessage: string): PersonalContext {
  const emotion = detectEmotionalContext(userMessage);
  const open = isOpenToHelp(userMessage);

  return {
    whatHelped: open ? retrieveWhatHelped(emotion) : [],
    recentMood: getRecentMood(),
    recentCheckins: getRecentCheckins(),
    relevantAssessments: getRelevantAssessments(),
    relevantEpisodes: getRelevantEpisodes(),
  };
}

/**
 * Format personal context as a warm system prompt block.
 * The model uses this like a friend who remembers — naturally, not like an app reading data.
 */
export function personalRagBlock(userMessage: string): string {
  const ctx = retrievePersonalContext(userMessage);
  const lines: string[] = [];

  if (ctx.recentMood) lines.push(`- ${ctx.recentMood}`);

  if (ctx.recentCheckins) lines.push(`- ${ctx.recentCheckins}`);

  if (ctx.relevantAssessments) lines.push(`- ${ctx.relevantAssessments}`);

  if (ctx.relevantEpisodes) lines.push(`- ${ctx.relevantEpisodes}`);

  if (ctx.whatHelped.length > 0) {
    const skills = ctx.whatHelped.map((s) => `"${s}"`).join(", ");
    lines.push(`- Skills that have helped before: ${skills}. Use this naturally — "you mentioned grounding helped last time" rather than listing them. Only mention if it fits the conversation.`);
  }

  if (lines.length === 0) return "";

  return "PERSONAL CONTEXT (use this like a friend who remembers — never like an app reading data):\n" + lines.join("\n");
}

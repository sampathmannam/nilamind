// Enhanced offline companion — deterministic, warm responses when the model isn't ready.
// Research: Finch (no LLM, pure scripted responses, #1 retention). Woebot (CBT flows).
// When the 1.5B is loading (cold start ~30-60s with precache) or unavailable (web/OOM),
// Nila provides scripted, emotionally-aware responses that feel warm and personal,
// not like a "model not available" error message.

import { crisisLinesInline } from "./crisisResources";
import {
  WELCOME_FIRST, WELCOME_RETURNING, CRISIS_RESPONSE,
  detectEmotionUnified,
} from "./personaConfig";

const OFFLINE_RESPONSES: Record<string, string[]> = {
  // Warm opening responses — the first thing a new user sees
  welcome: [WELCOME_FIRST],

  // Greeting responses for returning users
  returning: [WELCOME_RETURNING],

  // Anxiety responses
  anxious: [
    "I hear the anxiety in that — it makes sense. I'd like to walk through something that helps calm your body. Want to try a grounding exercise together?",
    "That anxious feeling is real. Let's take a slow breath together — just one. In through your nose, out through your mouth. How does your body feel now?",
  ],

  // Low mood responses
  sad: [
    "That sounds really heavy. You don't have to figure it out right now — just being here counts. What's been weighing on you most?",
    "Tough days are exhausting. You're still showing up, and that matters. One small thing: what moment today felt even slightly less hard?",
  ],

  // Anger responses
  angry: [
    "That would make anyone angry. Let yourself feel it — it's real. What's underneath the anger?",
  ],

  // Celebration responses
  happy: [
    "That's wonderful — genuinely. What do you think helped today feel different?",
  ],

  // Numbness responses
  numb: [
    "Numbness is its own kind of pain. You don't have to feel anything right now. Just being here is enough.",
  ],

  // Crisis responses — always include crisis lines
  crisis: [CRISIS_RESPONSE.replace("[REGION_CRISIS_LINES]", "[CRISIS_LINES]")],

  // Neutral/fallback
  neutral: [
    "I'm here. However today is landing, you don't have to face it alone. Want to talk about what's on your mind?",
    "Just checking in — how are you feeling right now?",
  ],
};

/**
 * Get a warm, emotionally-appropriate offline response.
 * Uses deterministic rotation so the user never sees the same response twice in a row.
 */
export function enhancedOfflineReply(userMessage: string): string {
  const emotion = detectEmotionUnified(userMessage);
  const responses = OFFLINE_RESPONSES[emotion] ?? OFFLINE_RESPONSES.neutral;

  // Deterministic rotation based on message length (not time — avoids same response on refresh)
  const idx = (userMessage.length + (emotion === "crisis" ? 0 : Math.floor(Date.now() / 60000))) % responses.length;
  let reply = responses[idx];

  // Replace crisis line placeholder
  if (emotion === "crisis") {
    try {
      reply = reply.replace("[CRISIS_LINES]", crisisLinesInline());
    } catch {
      reply = reply.replace("[CRISIS_LINES]", "Call 988 for the Suicide & Crisis Lifeline.");
    }
  }

  // Add warm context note when model is loading
  const note = emotion === "crisis"
    ? ""
    : "\n\n(My on-device voice is still quietly waking up — but I'm here, and your safety tools are ready.)";

  return reply + note;
}

/**
 * Get Nila's first message for new users.
 * Should be called when the chat is empty and no prior conversation exists.
 */
export function getWelcomeMessage(isReturning: boolean = false): string {
  const hour = new Date().getHours();
  let prefix: string;
  if (hour < 5) prefix = "Good night";
  else if (hour < 12) prefix = "Good morning";
  else if (hour < 17) prefix = "Hey";
  else if (hour < 22) prefix = "Good evening";
  else prefix = "Good night";

  if (isReturning) {
    return `${prefix} — ${WELCOME_RETURNING}`;
  }
  return `${prefix} — ${WELCOME_FIRST}`;
}

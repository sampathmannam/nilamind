// Response Anti-Pattern Filter — removes robotic, generic, or formulaic phrases
// from model responses. The 1.5B model sometimes produces helpdesk-style or
// therapist-cliché responses despite prompt instructions. This deterministic
// post-processing catches and removes those patterns.

/** Phrases that should NEVER appear in Nila's responses. */
const ANTI_PATTERNS: RegExp[] = [
  // Helpdesk register
  /\bhow may i (assist|help) you\b/i,
  /\bis there anything else\b/i,
  /\bplease don't hesitate\b/i,
  /\blet me know (what|if|how) (else|more) i can (help|do|assist)\b/i,
  /\bi'm here to support you\b/i,
  /\bplease reach out (if|whenever)\b/i,
  /\bi'm here (if|when) you need\b/i,
  /\bfeel free to\b/i,

  // Generic therapist clichés
  /\bthat's a great question\b/i,
  /\bthank you for sharing\b/i,
  /\bi'm (so )?sorry (to hear|you('re)? feeling)\b/i,
  /\bi (completely |totally )?understand (how|what) you('re)? (going through|feeling)\b/i,
  /\byou('re)? (so|very) (brave|strong|courageous)\b/i,
  /\b(just |)remember (that |)(you('re)?|it('s)?)\b/i,
  /\bi('m| am) proud of you\b/i,
  /\byou should be proud\b/i,

  // Lists disguised as prose
  /\bfirst[,;]?\s+(i|you|we|let)/i,
  /\bsecond[,;]?\s+(i|you|we|let)/i,
  /\bfinally[,;]?\s+(i|you|we|let)/i,

  // Clinical/diagnostic language
  /\byou have (depression|anxiety|bipolar|bpd|ptsd|ocd)\b/i,
  /\byour (depression|anxiety|bipolar|bpd|ptsd|ocd) (is|causes|makes)\b/i,
  /\byou('re)? (suffering from|diagnosed with|showing signs of)\b/i,

  // Toxicology/medication advice
  /\byou should (stop|start|taper|reduce|increase) (your |the |)(medication|meds|dose)\b/i,
  /\b(take|try) (this |a |the |)(medication|drug|pill|supplement)\b/i,
];

/** Phrases to trim from the START of responses. */
const START_TRIMS: string[] = [
  "i'm here for you. ",
  "i'm here with you. ",
  "i hear you. ",
  "that sounds really hard. ",
  "that's really tough. ",
  "that's a lot. ",
];

/**
 * Clean a model response by removing anti-patterns.
 * Returns the cleaned response text.
 */
export function cleanResponse(text: string): string {
  let cleaned = text.trim();

  // Apply anti-pattern regex replacements
  for (const pattern of ANTI_PATTERNS) {
    if (pattern.test(cleaned)) {
      // Remove the matched phrase
      cleaned = cleaned.replace(pattern, "");

      // Capitalize the first letter of the remaining text
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }

  // Trim repetitive openings (if the response has substance after the trim)
  for (const trim of START_TRIMS) {
    if (cleaned.toLowerCase().startsWith(trim)) {
      const rest = cleaned.slice(trim.length).trim();
      if (rest.length > 10) {
        cleaned = rest.charAt(0).toUpperCase() + rest.slice(1);
        break; // only trim one
      }
    }
  }

  // Remove excessive punctuation
  cleaned = cleaned.replace(/!{2,}/g, "!");
  cleaned = cleaned.replace(/\?{2,}/g, "?");
  cleaned = cleaned.replace(/\.{3,}/g, "...");

  // Remove trailing " — Nila" or " - Nila" (model sometimes signs its name)
  cleaned = cleaned.replace(/\s*[—–-]\s*Nila\s*$/i, "");

  // Ensure it ends with proper punctuation
  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += ".";
  }

  return cleaned;
}

/**
 * Score a response for quality on a 0-10 scale.
 * Lower score = more anti-patterns detected.
 */
export function qualityScore(text: string): number {
  let score = 10;
  const lower = text.toLowerCase();

  for (const pattern of ANTI_PATTERNS) {
    if (pattern.test(lower)) score -= 1;
  }

  // Length penalties
  if (text.length < 15) score -= 3; // too short
  if (text.length > 400) score -= 2; // too long (should be 2-4 sentences)

  // Containment check — if the response is just a trim phrase, it's empty
  const trimmed = text.toLowerCase().trim().replace(/[.!?]/g, "");
  if (START_TRIMS.some((t) => trimmed === t.trim().replace(/[.!?]/g, ""))) {
    score = 0;
  }

  return Math.max(0, score);
}

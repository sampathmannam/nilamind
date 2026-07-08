// Skill suggestion engine — matches user distress expressions to evidence-based coping skills
// surfaced as in-chat suggestion cards. Pure, deterministic, privacy-first.

import { filterSkills, type Skill } from "./skillsLibrary";
import { scanForCrisis } from "../safety";

export interface SkillSuggestion {
  skill: Skill;
  reason: string;
  emoji: string;
}

// Mapping of distress signals → skill group most relevant
const DISTRESS_MAP: [RegExp, string, string, string][] = [
  // [pattern, groupId, reason, emoji]
  [/\b(panic|racing heart|can'?t breathe|chest tight|dizzy|heart pounding)\b/i, "crisis", "Racing heart or panic sensation", "🫀"],
  [/\b(overwhelm|too much|can'?t cope|falling apart|losing it|everything at once)\b/i, "crisis", "Feeling overwhelmed", "🌊"],
  [/\b(urge|impulse|want to hurt|want to scream|about to lose it|self.?harm)\b/i, "crisis", "Urges and impulses", "🛑"],
  
  [/\b(mindful|present|grounded|focus|aware|now)\b/i, "mindfulness", "Wanting to be present", "🧘"],
  [/\b(spiraling|spinning|ruminating|overthinking|looping|can'?t stop thinking|racing thoughts)\b/i, "mindfulness", "Racing or looping thoughts", "🌀"],
  
  [/\b(sad|low|empty|hopeless|flat|numb|depressed|no energy|no motivation)\b/i, "emotion", "Low mood or emptiness", "💙"],
  [/\b(angry|rage|furious|irritated|snap|frustrated|resentful)\b/i, "emotion", "Anger or irritation", "🔥"],
  [/\b(afraid|scared|fear|terrified|worried|dreading)\b/i, "emotion", "Fear or worry", "😰"],
  
  [/\b(relationship|someone said|they don'?t understand|argument|fight with|conflict with)\b/i, "relationships", "Relationship difficulty", "💬"],
  [/\b(boundary|say no|stood up for|people pleaser|standing up)\b/i, "relationships", "Setting boundaries", "🤚"],
  
  [/\b(distorted|thinking trap|all or nothing|black and white|catastrophizing|mind reading)\b/i, "thoughts", "Unhelpful thinking pattern", "🔍"],
  [/\b(what if|worst case|something bad|terrible happen)\b/i, "thoughts", "Catastrophic worry", "🎯"],
  
  [/\b(meaning|purpose|what matters|values|direction|lost|stuck|what should i do)\b/i, "values", "Searching for direction", "🧭"],
  
  [/\b(hat(e|ing) myself|i'?m awful|i'?m a failure|not good enough|critic in my head|i suck|i'?m worthless)\b/i, "compassion", "Harsh self-criticism", "🤗"],
  [/\b(lonely|alone|nobody|no one|isolated|disconnected)\b/i, "compassion", "Loneliness", "💙"],
];

/** Find the best skill suggestion for a user message. Returns null if nothing matches or if crisis. */
export function suggestSkill(userMessage: string): SkillSuggestion | null {
  if (!userMessage || scanForCrisis(userMessage)) return null;
  
  for (const [pattern, groupId, reason, emoji] of DISTRESS_MAP) {
    if (pattern.test(userMessage)) {
      const skills = filterSkills("", groupId);
      if (skills.length === 0) continue;
      // Pick the first skill in the matched group
      const skill = skills[0];
      return { skill, reason, emoji };
    }
  }
  return null;
}

// Skill suggestion engine — matches user distress expressions to evidence-based coping skills
// surfaced as in-chat suggestion cards. Pure, deterministic, privacy-first.

import { filterSkills, type Skill } from "./skillsLibrary";
import { scanForCrisis } from "../safety";

export interface SkillSuggestion {
  skill: Skill;
  reason: string;
  emoji: string;
}

// Mapping of distress signals → skill group + the SPECIFIC skill within that group best matched to the
// signal (2026-07-12 clinical research wave 2, Task E). Previously this only recorded a groupId and always
// picked skills[0] of the group regardless of which signal fired — e.g. anger and fear both silently
// resolved to the same "first skill" in "emotion". Matched, relevant routing is the one personalization that
// works: skills-use mediation only operates when the RELEVANT skill is practiced, per Neacsiu, Rizvi &
// Linehan (2010), Behaviour Research and Therapy. skillId falls back to skills[0] if the id is ever wrong/
// removed, so a typo here degrades gracefully rather than breaking the suggestion entirely.
const DISTRESS_MAP: [RegExp, string, string, string, string][] = [
  // [pattern, groupId, reason, emoji, skillId]
  [/\b(panic|racing heart|can'?t breathe|chest tight|dizzy|heart pounding)\b/i, "crisis", "Racing heart or panic sensation", "🫀", "tipp"],
  [/\b(overwhelm|too much|can'?t cope|falling apart|losing it|everything at once)\b/i, "crisis", "Feeling overwhelmed", "🌊", "accepts"],
  [/\b(urge|impulse|want to hurt|want to scream|about to lose it|self.?harm)\b/i, "crisis", "Urges and impulses", "🛑", "stop"],

  [/\b(mindful|present|grounded|focus|aware|now)\b/i, "mindfulness", "Wanting to be present", "🧘", "what-skills"],
  [/\b(spiraling|spinning|ruminating|overthinking|looping|can'?t stop thinking|racing thoughts)\b/i, "mindfulness", "Racing or looping thoughts", "🌀", "54321"],

  [/\b(sad|low|empty|hopeless|flat|numb|depressed|no energy|no motivation)\b/i, "emotion", "Low mood or emptiness", "💙", "opposite-action"],
  [/\b(angry|rage|furious|irritated|snap|frustrated|resentful)\b/i, "emotion", "Anger or irritation", "🔥", "ride-the-wave"],
  [/\b(afraid|scared|fear|terrified|worried|dreading)\b/i, "emotion", "Fear or worry", "😰", "check-the-facts"],

  [/\b(relationship|someone said|they don'?t understand|argument|fight with|conflict with)\b/i, "relationships", "Relationship difficulty", "💬", "give"],
  [/\b(boundary|say no|stood up for|people pleaser|standing up)\b/i, "relationships", "Setting boundaries", "🤚", "dearman"],

  [/\b(distorted|thinking trap|all or nothing|black and white|catastrophizing|mind reading)\b/i, "thoughts", "Unhelpful thinking pattern", "🔍", "spot-distortion"],
  [/\b(what if|worst case|something bad|terrible happen)\b/i, "thoughts", "Catastrophic worry", "🎯", "worry-time"],

  [/\b(meaning|purpose|what matters|values|direction|lost|stuck|what should i do)\b/i, "values", "Searching for direction", "🧭", "values-clarify"],

  [/\b(hat(e|ing) myself|i'?m awful|i'?m a failure|not good enough|critic in my head|i suck|i'?m worthless)\b/i, "compassion", "Harsh self-criticism", "🤗", "self-compassion-break"],
  [/\b(lonely|alone|nobody|no one|isolated|disconnected)\b/i, "compassion", "Loneliness", "💙", "compassionate-self"],
];

/** Find the best skill suggestion for a user message. Returns null if nothing matches or if crisis. */
export function suggestSkill(userMessage: string): SkillSuggestion | null {
  if (!userMessage || scanForCrisis(userMessage)) return null;

  for (const [pattern, groupId, reason, emoji, skillId] of DISTRESS_MAP) {
    if (pattern.test(userMessage)) {
      const skills = filterSkills("", groupId);
      if (skills.length === 0) continue;
      // Pick the skill matched to THIS specific signal; fall back to the group's first skill only if the
      // id is somehow missing (defensive — should never happen with a maintained SKILLS array).
      const skill = skills.find((s) => s.id === skillId) ?? skills[0];
      return { skill, reason, emoji };
    }
  }
  return null;
}

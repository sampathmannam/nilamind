// RAG Warmth Enhancer — formats retrieved context for maximum naturalness.
// The 1.5B model sometimes lists RAG data verbatim ("You used grounding, breathing, and TIPP").
// This module provides guidance on HOW to use retrieved data — like a friend who remembers,
// never like an app reading a database.
//
// Research: People respond better to AI that references their data naturally
// ("you mentioned evenings are rough") vs. clinically ("your distress averages 6.2/10").
// This module enforces the natural style.

interface RagContext {
  hasPersonalData: boolean;
  hasSkills: boolean;
  hasMemory: boolean;
  hasPsychoed: boolean;
}

/**
 * Generate model guidance for using RAG data warmly.
 * Injected as a dedicated block near the end of the system prompt.
 */
export function ragWarmthGuidance(ctx: RagContext): string {
  const lines: string[] = [];

  lines.push("RAG GUIDANCE — how to use the context you've been given:");

  if (ctx.hasPersonalData) {
    lines.push("- Use personal data like a friend remembering: 'You mentioned evenings are rough' not 'According to your data...'");
    lines.push("- Reference what helped before NATURALLY: 'Grounding helped last week' not 'Your skill history shows...'");
    lines.push("- Never quote numbers or scores directly — say 'things have been harder lately' not 'your PHQ-9 is 15'");
  }

  if (ctx.hasSkills) {
    lines.push("- When suggesting a skill, say WHY it might help based on their context — connect it to what they shared.");
    lines.push("- Offer skills as invitations: 'Some people find grounding helps' not 'You should try grounding.'");
  }

  if (ctx.hasMemory) {
    lines.push("- Reference past conversations warmly: 'We talked about this last week' not 'On July 12 you said...'");
    lines.push("- Use memory to show you've been listening, not to prove you have a database.");
  }

  lines.push("- If the context doesn't fit this conversation, IGNORE IT. Better to be present than to force a reference.");
  lines.push("- ONE reference per reply is usually enough. Don't cram everything in.");

  return lines.join("\n");
}

/**
 * Analyze what RAG data is available and return guidance.
 */
export function analyzeRagContext(
  personalRag: string,
  skills: string,
  memory: string,
  psychoed: string,
): RagContext {
  return {
    hasPersonalData: personalRag.length > 10,
    hasSkills: skills.length > 10,
    hasMemory: memory.length > 10,
    hasPsychoed: psychoed.length > 10,
  };
}

/**
 * Full RAG guidance block — to be appended at the end of the system prompt
 * when any RAG data is present.
 */
export function ragGuidanceBlock(
  personalRag: string,
  skills: string,
  memory: string,
  psychoed: string = "",
): string {
  const ctx = analyzeRagContext(personalRag, skills, memory, psychoed);
  const hasAny = ctx.hasPersonalData || ctx.hasSkills || ctx.hasMemory || ctx.hasPsychoed;
  if (!hasAny) return "";
  return ragWarmthGuidance(ctx);
}

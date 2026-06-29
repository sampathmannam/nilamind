// src/services/episodePrompt.ts
// Pure builder for the episode-mode system instruction. Mirrors the existing
// registerIntensityAndTriggerAI() assembly in EpisodeSupportScreen.tsx, byte-for-byte, so the
// episode prompt + last-5-episode context + skills block are preserved when the send path moves
// into the unified Nila sendToNila(). Crisis-line substitution happens here (invariant #4); the
// EPISODE prompt is always the base (invariant #5).

import { EPISODE_SYSTEM_PROMPT } from "../components/EpisodeSupportScreen";
import { crisisLinesInline } from "./crisisResources";
import { skillsPromptBlock } from "./skillsLibrary";
import { EpisodeRecord } from "../types";

// PRIVACY — deliberate divergence from buildReflectionDigest (nilaContext.ts), documented on purpose:
// the reflection digest is an AUTOMATIC background job, so it minimizes hard and never sends free-text
// (incl. an episode's `trigger`). This block, by contrast, builds the LIVE episode-companion prompt the
// user explicitly invoked while in an episode — `trigger` is their own words, typed for exactly this
// support flow, replayed so the companion can actually help (continuity = the most useful field here).
// It is passed to the on-device model for that one turn and never leaves the device. "Help is the only metric":
// keeping the user's own trigger in live, user-initiated support is the help-preserving choice, and is
// not covert collection. If this ever moves to an automatic/background path, switch to a derived block.
/** Inline the last 5 episode records in the exact format the existing screen used. */
export function buildEpisodeContextBlock(episodes: EpisodeRecord[]): string {
  let block = "CONTEXT — YOUR EPISODE HISTORY:\n";
  if (episodes && episodes.length > 0) {
    const last5 = episodes.slice(-5);
    last5.forEach((e) => {
      block += `- Date: ${e.date}, Trigger: ${e.trigger || "Not given"}, Helped by: ${e.skillsHelpful.join(", ")}, Duration: ${e.durationMinutes} min, Start: ${e.startIntensity}/10\n`;
    });
  }
  return block;
}

/** Full episode-mode system instruction: prompt (crisis lines substituted) + context + skills. */
export function buildEpisodeSystem(episodes: EpisodeRecord[]): string {
  const prompt = EPISODE_SYSTEM_PROMPT.replace("[REGION_CRISIS_LINES]", crisisLinesInline());
  const context = buildEpisodeContextBlock(episodes);
  return prompt + "\n" + context + "\n\n" + skillsPromptBlock();
}

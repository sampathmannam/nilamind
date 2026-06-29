import { describe, it, expect } from "vitest";
import { buildEpisodeContextBlock, buildEpisodeSystem } from "./episodePrompt";
import { EPISODE_SYSTEM_PROMPT } from "../components/EpisodeSupportScreen";
import { EpisodeRecord } from "../types";

function ep(date: string, trigger: string, skills: string[], dur: number, start: number): EpisodeRecord {
  return {
    id: "ep_" + date, date, time: "10:00", dayOfWeek: "Monday", timeOfDay: "morning",
    trigger, skillsHelpful: skills, startIntensity: start, peakIntensity: start, endIntensity: 3,
    durationMinutes: dur, humanContactPrompted: false, crisisLineShown: false,
  };
}

describe("buildEpisodeContextBlock", () => {
  it("starts with the history header even when empty", () => {
    expect(buildEpisodeContextBlock([])).toBe("CONTEXT — YOUR EPISODE HISTORY:\n");
  });
  it("inlines only the last 5 episodes in the existing format", () => {
    const list = Array.from({ length: 7 }, (_, i) => ep(`2026-06-1${i}`, `T${i}`, ["TIPP"], 10 + i, 8));
    const block = buildEpisodeContextBlock(list);
    expect(block).not.toContain("T0"); // first two dropped
    expect(block).not.toContain("T1");
    expect(block).toContain("Trigger: T6");
    expect((block.match(/- Date:/g) || []).length).toBe(5);
  });
});

describe("buildEpisodeSystem (invariants #4 + #5)", () => {
  it("uses the EPISODE prompt, not the companion prompt", () => {
    const sys = buildEpisodeSystem([]);
    expect(sys).toContain("EPISODE SUPPORT");
    expect(sys).toContain("THE EXACT SEQUENCE");
  });
  it("leaves no [REGION_CRISIS_LINES] substring in the outgoing systemInstruction", () => {
    // sanity: the raw prompt DOES contain the placeholder before substitution
    expect(EPISODE_SYSTEM_PROMPT).toContain("[REGION_CRISIS_LINES]");
    const sys = buildEpisodeSystem([ep("2026-06-19", "rejection", ["TIPP"], 12, 8)]);
    expect(sys).not.toContain("[REGION_CRISIS_LINES]");
  });
  it("appends the episode context block", () => {
    const sys = buildEpisodeSystem([ep("2026-06-19", "rejection", ["TIPP"], 12, 8)]);
    expect(sys).toContain("CONTEXT — YOUR EPISODE HISTORY:");
    expect(sys).toContain("Trigger: rejection");
  });
});

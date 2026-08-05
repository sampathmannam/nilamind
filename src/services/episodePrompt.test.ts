import { describe, it, expect, vi } from "vitest";
import { buildEpisodeContextBlock, buildEpisodeSystem } from "./episodePrompt";
import { EPISODE_STEER_PROMPT } from "./episodePrompt";
import { EpisodeRecord } from "../types";

vi.mock("./nilaContext", () => ({
  buildPersonalContext: vi.fn(() => "WHAT YOU ALREADY KNOW ABOUT THEM\n- They like evenings."),
  activeProtocolContextBlock: vi.fn(() => ""),
}));

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

describe("buildEpisodeSystem (invariants #4 + #5, audit fix #2)", () => {
  it("uses the unified companion persona plus an episode steer, not a standalone robotic script", () => {
    const sys = buildEpisodeSystem([]);
    expect(sys).toContain("You are Nila"); // companion persona base
    expect(sys).toContain("EPISODE SUPPORT STEER"); // episode addendum
    expect(sys).toContain(EPISODE_STEER_PROMPT); // steer is present
    expect(sys).not.toContain("THE EXACT SEQUENCE"); // rigid 6-step script removed
  });
  it("feeds buildPersonalContext into episode mode", () => {
    const sys = buildEpisodeSystem([]);
    expect(sys).toContain("WHAT YOU ALREADY KNOW ABOUT THEM");
  });
  it("leaves no [REGION_CRISIS_LINES] substring in the outgoing systemInstruction", () => {
    const sys = buildEpisodeSystem([ep("2026-06-19", "rejection", ["TIPP"], 12, 8)]);
    expect(sys).not.toContain("[REGION_CRISIS_LINES]");
  });
  it("appends the episode context block", () => {
    const sys = buildEpisodeSystem([ep("2026-06-19", "rejection", ["TIPP"], 12, 8)]);
    expect(sys).toContain("CONTEXT — YOUR EPISODE HISTORY:");
    expect(sys).toContain("Trigger: rejection");
  });
  it("uses relevant skills when a query is provided", () => {
    const sys = buildEpisodeSystem([], "I can't sleep and my mind is racing");
    // relevantSkillsBlock returns a non-empty block for a recognizable concern
    expect(sys).toMatch(/SKILL|skill/i);
  });
});

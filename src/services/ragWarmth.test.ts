import { describe, it, expect } from "vitest";
import { ragWarmthGuidance, analyzeRagContext, ragGuidanceBlock } from "./ragWarmth";

describe("analyzeRagContext", () => {
  it("flags each context type present above the length threshold", () => {
    expect(analyzeRagContext("some personal data here", "", "", "")).toEqual({
      hasPersonalData: true,
      hasSkills: false,
      hasMemory: false,
      hasPsychoed: false,
    });
    expect(analyzeRagContext("", "some skills block here", "some memory block here", "some psychoed block")).toEqual({
      hasPersonalData: false,
      hasSkills: true,
      hasMemory: true,
      hasPsychoed: true,
    });
  });

  it("treats short/empty strings (<=10 chars) as absent", () => {
    expect(analyzeRagContext("short", "", "", "")).toEqual({
      hasPersonalData: false,
      hasSkills: false,
      hasMemory: false,
      hasPsychoed: false,
    });
  });
});

// Device-QA 2026-07-15: the memory guidance line must explicitly forbid RESTATING the memory block back to
// the user (not just forbid a specific date-attribution phrasing) — this is the instruction-level half of the
// scaffold-leak fix, paired with the data-shape fix in conversationMemory.ts's formatMemoryBlock.
describe("ragWarmthGuidance — memory guidance forbids restating the memory block", () => {
  it("includes an explicit anti-restatement instruction when memory is present", () => {
    const guidance = ragWarmthGuidance({ hasPersonalData: false, hasSkills: false, hasMemory: true, hasPsychoed: false });
    expect(guidance.toLowerCase()).toMatch(/never (quote|restate|list|repeat)/);
  });

  it("omits memory guidance when no memory is present", () => {
    const guidance = ragWarmthGuidance({ hasPersonalData: false, hasSkills: false, hasMemory: false, hasPsychoed: false });
    expect(guidance.toLowerCase()).not.toContain("past conversations");
  });
});

describe("ragGuidanceBlock", () => {
  it("returns empty string when nothing is present", () => {
    expect(ragGuidanceBlock("", "", "", "")).toBe("");
  });

  it("returns guidance text when any context is present", () => {
    expect(ragGuidanceBlock("", "", "some memory block content", "")).toContain("RAG GUIDANCE");
  });
});

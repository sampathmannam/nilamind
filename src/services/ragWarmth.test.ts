import { describe, it, expect } from "vitest";
import { analyzeRagContext, ragWarmthGuidance, ragGuidanceBlock } from "./ragWarmth";

describe("analyzeRagContext", () => {
  it("returns all false for empty strings", () => {
    const ctx = analyzeRagContext("", "", "", "");
    expect(ctx.hasPersonalData).toBe(false);
    expect(ctx.hasSkills).toBe(false);
    expect(ctx.hasMemory).toBe(false);
    expect(ctx.hasPsychoed).toBe(false);
  });

  it("returns all true for strings longer than 10 chars", () => {
    const ctx = analyzeRagContext(
      "personal data here",
      "skills data here",
      "memory data here",
      "psychoed data here",
    );
    expect(ctx.hasPersonalData).toBe(true);
    expect(ctx.hasSkills).toBe(true);
    expect(ctx.hasMemory).toBe(true);
    expect(ctx.hasPsychoed).toBe(true);
  });

  it("returns partial true for mixed lengths", () => {
    const ctx = analyzeRagContext(
      "short",
      "long enough content",
      "",
      "also long enough",
    );
    expect(ctx.hasPersonalData).toBe(false);
    expect(ctx.hasSkills).toBe(true);
    expect(ctx.hasMemory).toBe(false);
    expect(ctx.hasPsychoed).toBe(true);
  });

  it("treats exactly 10 chars as false", () => {
    const ctx = analyzeRagContext("1234567890", "1234567890", "1234567890", "1234567890");
    expect(ctx.hasPersonalData).toBe(false);
    expect(ctx.hasSkills).toBe(false);
    expect(ctx.hasMemory).toBe(false);
    expect(ctx.hasPsychoed).toBe(false);
  });

  it("treats 11 chars as true", () => {
    const ctx = analyzeRagContext("12345678901", "", "", "");
    expect(ctx.hasPersonalData).toBe(true);
  });
});

describe("ragWarmthGuidance", () => {
  it("returns a non-empty string with header", () => {
    const guidance = ragWarmthGuidance({
      hasPersonalData: false,
      hasSkills: false,
      hasMemory: false,
      hasPsychoed: false,
    });
    expect(guidance.length).toBeGreaterThan(0);
    expect(guidance).toContain("RAG GUIDANCE");
  });

  it("includes personal data lines when hasPersonalData is true", () => {
    const guidance = ragWarmthGuidance({
      hasPersonalData: true,
      hasSkills: false,
      hasMemory: false,
      hasPsychoed: false,
    });
    expect(guidance).toContain("personal data");
  });

  it("includes skill lines when hasSkills is true", () => {
    const guidance = ragWarmthGuidance({
      hasPersonalData: false,
      hasSkills: true,
      hasMemory: false,
      hasPsychoed: false,
    });
    expect(guidance).toContain("skill");
  });

  it("includes memory lines when hasMemory is true", () => {
    const guidance = ragWarmthGuidance({
      hasPersonalData: false,
      hasSkills: false,
      hasMemory: true,
      hasPsychoed: false,
    });
    expect(guidance).toContain("memory");
  });

  it("always includes the catch-all guidance lines", () => {
    const guidance = ragWarmthGuidance({
      hasPersonalData: false,
      hasSkills: false,
      hasMemory: false,
      hasPsychoed: false,
    });
    expect(guidance).toContain("IGNORE IT");
    expect(guidance).toContain("ONE reference per reply");
  });
});

describe("ragGuidanceBlock", () => {
  it("returns empty string when all inputs are empty", () => {
    expect(ragGuidanceBlock("", "", "", "")).toBe("");
  });

  it("returns guidance when personalRag is non-empty", () => {
    const block = ragGuidanceBlock("some personal context here", "", "", "");
    expect(block).toContain("RAG GUIDANCE");
    expect(block.length).toBeGreaterThan(0);
  });

  it("returns guidance when any input is non-empty", () => {
    expect(ragGuidanceBlock("", "", "some memory context here", "")).toContain("RAG GUIDANCE");
  });

  it("defaults psychoed parameter to empty", () => {
    const block = ragGuidanceBlock("personal data here", "skills here", "memory here");
    expect(block).toContain("RAG GUIDANCE");
  });
});

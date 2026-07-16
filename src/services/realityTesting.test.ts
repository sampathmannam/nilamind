import { describe, it, expect } from "vitest";
import {
  validateMemoryRetrieval,
  detectNegativeBias,
  type MemoryEntry,
  type ValidationResult,
} from "./realityTesting";

describe("validateMemoryRetrieval", () => {
  it("flags high-distress low-evidence memories", () => {
    const memory: MemoryEntry = {
      text: "Everything is falling apart",
      distress: 8,
      evidence: 2,
      date: "2026-07-10",
    };
    const result = validateMemoryRetrieval(memory);
    expect(result.flagged).toBe(true);
    expect(result.reason).toContain("low evidence");
  });

  it("passes high-distress high-evidence memories", () => {
    const memory: MemoryEntry = {
      text: "I felt overwhelmed during the presentation",
      distress: 7,
      evidence: 8,
      date: "2026-07-10",
    };
    const result = validateMemoryRetrieval(memory);
    expect(result.flagged).toBe(false);
  });

  it("passes low-distress memories regardless of evidence", () => {
    const memory: MemoryEntry = {
      text: "Had a nice walk",
      distress: 3,
      evidence: 2,
      date: "2026-07-10",
    };
    const result = validateMemoryRetrieval(memory);
    expect(result.flagged).toBe(false);
  });

  it("provides a coaching response for flagged memories", () => {
    const memory: MemoryEntry = {
      text: "Nobody cares about me",
      distress: 9,
      evidence: 1,
      date: "2026-07-10",
    };
    const result = validateMemoryRetrieval(memory);
    expect(result.coachingText).toBeTruthy();
    expect(result.coachingText.length).toBeGreaterThan(0);
  });

  it("returns empty coaching text for unflagged memories", () => {
    const memory: MemoryEntry = {
      text: "Good day today",
      distress: 2,
      evidence: 8,
      date: "2026-07-10",
    };
    const result = validateMemoryRetrieval(memory);
    expect(result.coachingText).toBe("");
  });
});

describe("detectNegativeBias", () => {
  it("detects bias when negative memories dominate", () => {
    const memories: MemoryEntry[] = [
      { text: "Terrible day", distress: 9, evidence: 3, date: "2026-07-10" },
      { text: "Awful meeting", distress: 8, evidence: 2, date: "2026-07-11" },
      { text: "Failed test", distress: 7, evidence: 4, date: "2026-07-12" },
      { text: "Nice lunch", distress: 2, evidence: 7, date: "2026-07-13" },
    ];
    const result = detectNegativeBias(memories);
    expect(result.hasBias).toBe(true);
    expect(result.negativeRatio).toBeGreaterThan(0.5);
  });

  it("no bias when memories are balanced", () => {
    const memories: MemoryEntry[] = [
      { text: "Terrible day", distress: 8, evidence: 3, date: "2026-07-10" },
      { text: "Nice lunch", distress: 2, evidence: 7, date: "2026-07-11" },
      { text: "Good meeting", distress: 3, evidence: 8, date: "2026-07-12" },
      { text: "Fun evening", distress: 2, evidence: 9, date: "2026-07-13" },
    ];
    const result = detectNegativeBias(memories);
    expect(result.hasBias).toBe(false);
  });

  it("returns false for empty array", () => {
    const result = detectNegativeBias([]);
    expect(result.hasBias).toBe(false);
  });

  it("includes negative ratio in result", () => {
    const memories: MemoryEntry[] = [
      { text: "Bad", distress: 8, evidence: 2, date: "2026-07-10" },
      { text: "Worse", distress: 9, evidence: 1, date: "2026-07-11" },
    ];
    const result = detectNegativeBias(memories);
    expect(result.negativeRatio).toBe(1);
  });
});

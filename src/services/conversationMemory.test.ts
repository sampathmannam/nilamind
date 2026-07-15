import { describe, it, expect } from "vitest";
import { formatMemoryBlock, memoryCallbackBlock } from "./conversationMemory";

describe("conversationMemory — formatMemoryBlock", () => {
  it("includes Nila's response text", () => {
    const memories = [
      {
        id: "mem_1",
        timestamp: Date.now(),
        userText: "i feel anxious about work",
        nilaText: "That sounds like a lot to carry.",
        emotionWords: ["anxious"],
        topicWords: ["work"],
      },
    ];
    const block = formatMemoryBlock(memories);
    expect(block).toContain("That sounds like a lot to carry");
    expect(block).toContain("PAST CONVERSATIONS");
  });

  it("returns empty for no memories", () => {
    expect(formatMemoryBlock([])).toBe("");
  });

  it("truncates long user text", () => {
    const longText = "a".repeat(200);
    const memories = [
      {
        id: "mem_1",
        timestamp: Date.now(),
        userText: longText,
        nilaText: "short reply",
        emotionWords: [],
        topicWords: [],
      },
    ];
    const block = formatMemoryBlock(memories);
    expect(block).toContain("...");
  });
});

describe("conversationMemory — memoryCallbackBlock", () => {
  it("returns empty when no relevant memory", () => {
    const block = memoryCallbackBlock("something completely unrelated about cooking pasta");
    expect(block).toBe("");
  });

  it("returns string type", () => {
    const block = memoryCallbackBlock("hello");
    expect(typeof block).toBe("string");
  });
});

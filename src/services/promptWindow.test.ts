import { describe, it, expect } from "vitest";
import { coalesceSameRole, windowMessagesForCtx } from "./promptWindow";

describe("coalesceSameRole", () => {
  it("merges consecutive same-role messages into one", () => {
    const msgs = [
      { role: "user", content: "hello" },
      { role: "user", content: "are you there" },
      { role: "assistant", content: "hi!" },
    ];
    const result = coalesceSameRole(msgs);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("user");
    expect(result[0].content).toContain("hello");
    expect(result[0].content).toContain("are you there");
    expect(result[1].role).toBe("assistant");
    expect(result[1].content).toBe("hi!");
  });

  it("keeps alternating roles separate", () => {
    const msgs = [
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
    ];
    const result = coalesceSameRole(msgs);
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });

  it("handles empty array", () => {
    expect(coalesceSameRole([])).toEqual([]);
  });

  it("handles single message", () => {
    const msgs = [{ role: "assistant", content: "greeting" }];
    const result = coalesceSameRole(msgs);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("greeting");
  });

  it("does not mutate original messages", () => {
    const msgs = [
      { role: "user", content: "a" },
      { role: "user", content: "b" },
    ];
    coalesceSameRole(msgs);
    expect(msgs[0].content).toBe("a");
    expect(msgs[1].content).toBe("b");
  });
});

describe("windowMessagesForCtx", () => {
  const msgs = [
    { role: "user" as const, content: "greeting" },
    { role: "assistant" as const, content: "hi there" },
    { role: "user" as const, content: "how are you" },
    { role: "assistant" as const, content: "doing well" },
    { role: "user" as const, content: "tell me more" },
  ];

  it("returns all messages when within budget", () => {
    const result = windowMessagesForCtx(msgs, 3072);
    expect(result.length).toBeGreaterThanOrEqual(msgs.length);
  });

  it("always keeps first message (seeded greeting)", () => {
    const tinyBudget = 100;
    const result = windowMessagesForCtx(msgs, tinyBudget);
    expect(result[0]).toEqual(msgs[0]);
  });

  it("truncates oversized last message to fit budget", () => {
    const hugeContent = "x".repeat(10000);
    const singleMsg = [{ role: "user" as const, content: hugeContent }];
    const result = windowMessagesForCtx(singleMsg, 200);
    expect(result).toHaveLength(1);
    expect(result[0].content.length).toBeLessThan(hugeContent.length);
  });

  it("returns empty array for empty input", () => {
    expect(windowMessagesForCtx([], 3072)).toEqual([]);
  });

  it("handles 1-2 messages without dropping", () => {
    const pair = [
      { role: "user" as const, content: "hi" },
      { role: "assistant" as const, content: "hello" },
    ];
    const result = windowMessagesForCtx(pair, 3072);
    expect(result).toHaveLength(2);
  });

  it("respects custom maxChars cap", () => {
    const longMsgs = [
      { role: "user" as const, content: "greeting" },
      { role: "assistant" as const, content: "a".repeat(200) },
      { role: "user" as const, content: "b".repeat(200) },
      { role: "assistant" as const, content: "c".repeat(200) },
      { role: "user" as const, content: "d".repeat(200) },
    ];
    const totalOriginal = longMsgs.reduce((sum, m) => sum + m.content.length, 0);
    // nCtx large enough that ctxBudget is huge; maxChars=500 is the binding cap
    const result = windowMessagesForCtx(longMsgs, 10000, 500);
    const totalResult = result.reduce((sum, m) => sum + m.content.length, 0);
    expect(totalResult).toBeLessThan(totalOriginal);
  });
});

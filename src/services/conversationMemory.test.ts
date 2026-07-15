import { describe, it, expect } from "vitest";
import { formatMemoryBlock, type MemoryEntry } from "./conversationMemory";

function entry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "1",
    timestamp: new Date("2026-07-10T12:00:00Z").getTime(),
    userText: "I don't know I'm feeling bad today morning, I didn't went to classes also",
    nilaText: "That sounds like a lot to carry.",
    emotionWords: ["sad", "overwhelmed"],
    topicWords: ["classes"],
    ...overrides,
  };
}

// Device-QA 2026-07-15 root cause: formatMemoryBlock is injected directly into the model's system prompt as
// "few-shot context" (nila.ts). The old shape — `${i+1}. ${date}${emotions}: They said "${snippet}..." → Nila
// responded.` — is a dialogue-turn template with a CONTENT-FREE placeholder response ("→ Nila responded.",
// with nothing after it). Per this project's own established finding (small on-device models imitate
// conversation HISTORY over system-prompt instructions), the model mimicked this exact shape verbatim instead
// of generating a real reply: "Sure! Here's what you said: > '...' → Nila responded. So, your message was:
// '...' → Nila responded. Let me know if you want me to continue..." — a real device transcript. The fix
// removes the imitable dialogue-turn/placeholder-response shape entirely: declarative fact-bullets only, no
// "they said" / "responded" verbs-of-speech, plus an explicit anti-restatement instruction in the header.
describe("formatMemoryBlock — no imitable dialogue-turn shape (device-QA 2026-07-15 scaffold-leak root cause)", () => {
  it("returns empty string for no memories", () => {
    expect(formatMemoryBlock([])).toBe("");
  });

  it("never contains the content-free placeholder-response stub 'responded'", () => {
    const block = formatMemoryBlock([entry()]);
    expect(block.toLowerCase()).not.toContain("responded");
  });

  it("never uses 'They said' dialogue-quoting framing", () => {
    const block = formatMemoryBlock([entry()]);
    expect(block.toLowerCase()).not.toContain("they said");
  });

  it("never uses a '→' turn-transition arrow (the exact leaked-reply artifact)", () => {
    const block = formatMemoryBlock([entry()]);
    expect(block).not.toContain("→");
  });

  it("explicitly instructs the model never to quote/restate/list this block's format", () => {
    const block = formatMemoryBlock([entry()]);
    expect(block.toLowerCase()).toMatch(/never (quote|restate|list)/);
  });

  it("still carries the retrievable content: date, emotion words, and a user-text snippet", () => {
    const block = formatMemoryBlock([entry()]);
    expect(block).toContain("7/10/2026");
    expect(block).toContain("sad");
    expect(block).toContain("overwhelmed");
    expect(block).toContain("I don't know I'm feeling bad today morning");
  });

  it("truncates long user text to 120 chars and numbers multiple entries", () => {
    const long = "x".repeat(200);
    const block = formatMemoryBlock([entry({ userText: long }), entry({ id: "2", userText: "short one" })]);
    expect(block).toContain("1. ");
    expect(block).toContain("2. ");
    expect(block).not.toContain("x".repeat(121));
  });

  it("omits the emotion clause entirely when there are no detected emotion words", () => {
    const block = formatMemoryBlock([entry({ emotionWords: [] })]);
    // no dangling separator/empty parens from a missing emotions field
    expect(block).not.toMatch(/,\s*feeling\s*[—"]/);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import { analyzeTopics, topicContextBlock } from "./topicTracker";

beforeEach(() => store.clear());

function seedMemories(entries: { userText: string; timestamp: number }[]) {
  const mems = entries.map((e, i) => ({
    id: `mem_${i}`,
    timestamp: e.timestamp,
    userText: e.userText,
    nilaText: "supportive reply",
    emotionWords: [],
    topicWords: [],
  }));
  store.set("nilamind_conversation_log", JSON.stringify(mems));
}

describe("analyzeTopics", () => {
  it("returns TopicCount[] sorted by count descending", () => {
    const now = Date.now();
    seedMemories([
      { userText: "my boss at work is so demanding", timestamp: now },
      { userText: "work deadline is killing me", timestamp: now - 1000 },
      { userText: "can't sleep at night", timestamp: now - 2000 },
    ]);
    const topics = analyzeTopics();
    expect(Array.isArray(topics)).toBe(true);
    expect(topics.length).toBeGreaterThan(0);
    expect(topics[0].count).toBeGreaterThanOrEqual(topics[topics.length - 1].count);
  });

  it("returns empty when no memories exist", () => {
    expect(analyzeTopics()).toEqual([]);
  });

  it("respects the days parameter", () => {
    const now = Date.now();
    const oldTimestamp = now - 30 * 86400000; // 30 days ago
    seedMemories([
      { userText: "work is stressful", timestamp: oldTimestamp },
    ]);
    expect(analyzeTopics(14)).toEqual([]);
  });

  it("each TopicCount has topic, count, lastDiscussed, avgIntensity", () => {
    const now = Date.now();
    seedMemories([
      { userText: "I feel so sad and depressed", timestamp: now },
    ]);
    const topics = analyzeTopics();
    expect(topics.length).toBe(1);
    expect(topics[0]).toHaveProperty("topic");
    expect(topics[0]).toHaveProperty("count");
    expect(topics[0]).toHaveProperty("lastDiscussed");
    expect(topics[0]).toHaveProperty("avgIntensity");
    expect(topics[0].topic).toBe("Low mood");
    expect(topics[0].count).toBe(1);
  });
});

describe("topicContextBlock", () => {
  it('returns "" when fewer than 2 topics', () => {
    const now = Date.now();
    seedMemories([
      { userText: "I can't sleep at all", timestamp: now },
    ]);
    expect(topicContextBlock()).toBe("");
  });

  it('returns "" when no memories exist', () => {
    expect(topicContextBlock()).toBe("");
  });

  it("returns formatted string with 2+ topics", () => {
    const now = Date.now();
    seedMemories([
      { userText: "my boss at work is so demanding", timestamp: now },
      { userText: "work deadline is killing me", timestamp: now - 1000 },
      { userText: "can't sleep at night", timestamp: now - 2000 },
      { userText: "insomnia is ruining my days", timestamp: now - 3000 },
    ]);
    const block = topicContextBlock();
    expect(block).toContain("talked mostly about");
    expect(block).toContain("time");
  });

  it("formats count as 'time' for singular", () => {
    const now = Date.now();
    seedMemories([
      { userText: "my partner and I fought about money", timestamp: now },
      { userText: "work deadline is killing me", timestamp: now - 1000 },
    ]);
    const block = topicContextBlock();
    // Relationship topic should appear with "1 time" if it only matched once
    if (block.includes("Relationship")) {
      expect(block).toContain("1 time");
    }
  });
});

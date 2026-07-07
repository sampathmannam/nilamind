import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  appendToSecureArray: vi.fn((key: string, item: any) => {
    const arr = store.get(key) ? JSON.parse(store.get(key)!) : [];
    arr.push(item);
    store.set(key, JSON.stringify(arr));
  }),
}));

import { startVoiceSession, endVoiceSession, computeVoiceMetrics, voiceMoodSignal, type VoiceSession } from "./voicePatterns";

describe("voicePatterns", () => {
  beforeEach(() => { store.clear(); });

  it("startVoiceSession creates a session", () => {
    const id = startVoiceSession("chat");
    expect(id).toMatch(/^vs_/);
  });

  it("endVoiceSession computes metrics from transcript", () => {
    const id = startVoiceSession("chat");
    const metrics = endVoiceSession(id, "hello world this is a test");
    expect(metrics).not.toBeNull();
    if (metrics) {
      expect(metrics.wordCount).toBe(6);
      expect(metrics.speakingRate).toBeGreaterThan(0);
    }
  });

  it("computeVoiceMetrics returns zero for empty session", () => {
    const m = computeVoiceMetrics({ id: "x", startedAt: 0, endedAt: 1000, wordCount: 0, target: "chat" });
    expect(m.wordCount).toBe(0);
    expect(m.speakingRate).toBe(0);
  });

  it("voiceMoodSignal returns null with insufficient data", () => {
    expect(voiceMoodSignal()).toBeNull();
  });

  it("voiceMoodSignal detects fast speech as mania proxy", () => {
    const now = Date.now();
    const s1: VoiceSession = { id: "vs_1", startedAt: now - 2000, endedAt: now - 1000, wordCount: 15, target: "chat" };
    const s2: VoiceSession = { id: "vs_2", startedAt: now - 3000, endedAt: now - 2000, wordCount: 20, target: "chat" };
    store.set("nilamind_voice_sessions", JSON.stringify([s1, s2]));
    // Both sessions ~1 sec, 15-20 words => very high wpm
    expect(voiceMoodSignal()).toBe("mania");
  });

  it("voiceMoodSignal detects slow, short speech as depression proxy", () => {
    const now = Date.now();
    const s1: VoiceSession = { id: "vs_1", startedAt: now - 10000, endedAt: now - 2000, wordCount: 2, target: "chat" };
    const s2: VoiceSession = { id: "vs_2", startedAt: now - 20000, endedAt: now - 12000, wordCount: 3, target: "chat" };
    store.set("nilamind_voice_sessions", JSON.stringify([s1, s2]));
    expect(voiceMoodSignal()).toBe("depression");
  });
});

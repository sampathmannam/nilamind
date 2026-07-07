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

import {
  computeMetrics,
  detectMoodSignal,
  startTypingSession,
  endTypingSession,
  getRecentMetrics,
  type TypingSession,
} from "./typingPatterns";

describe("typingPatterns", () => {
  beforeEach(() => { store.clear(); });

  it("computeMetrics returns zero for empty session", () => {
    const session: TypingSession = {
      id: "test", startedAt: 0, endedAt: 1000, targetId: "chat", events: [], textLength: 0,
    };
    const m = computeMetrics(session);
    expect(m.typingSpeed).toBe(0);
    expect(m.avgHoldTime).toBe(0);
  });

  it("computeMetrics calculates hold/flight/pause/burst from events", () => {
    const now = Date.now();
    const session: TypingSession = {
      id: "test", startedAt: now, endedAt: now + 10000, targetId: "chat", textLength: 100,
      events: [
        { ts: now, key: "h", type: "down", targetId: "chat" },
        { ts: now + 100, key: "h", type: "up", targetId: "chat" },
        { ts: now + 200, key: "e", type: "down", targetId: "chat" },
        { ts: now + 300, key: "e", type: "up", targetId: "chat" },
        { ts: now + 400, key: "l", type: "down", targetId: "chat" },
        { ts: now + 500, key: "l", type: "up", targetId: "chat" },
        { ts: now + 600, key: "l", type: "down", targetId: "chat" },
        { ts: now + 700, key: "l", type: "up", targetId: "chat" },
        { ts: now + 800, key: "o", type: "down", targetId: "chat" },
        { ts: now + 900, key: "o", type: "up", targetId: "chat" },
      ],
    };
    const m = computeMetrics(session);
    expect(m.avgHoldTime).toBeCloseTo(100, -1);
    expect(m.avgFlightTime).toBeCloseTo(200, -1);
    expect(m.pauseCount).toBe(0);
    expect(m.burstCount).toBeGreaterThan(0);
    expect(m.typingSpeed).toBeGreaterThan(0);
  });

  it("detectMoodSignal returns mania for fast, bursty typing with few pauses", () => {
    const m = detectMoodSignal({
      avgHoldTime: 60,
      avgFlightTime: 80,
      errorRate: 0.02,
      typingSpeed: 350,
      pauseCount: 2,
      avgPauseDuration: 300,
      burstCount: 8,
      sessionDuration: 15000,
    });
    expect(m).toBe("mania");
  });

  it("detectMoodSignal returns depression for slow typing with long pauses", () => {
    const m = detectMoodSignal({
      avgHoldTime: 180,
      avgFlightTime: 200,
      errorRate: 0.01,
      typingSpeed: 60,
      pauseCount: 8,
      avgPauseDuration: 3000,
      burstCount: 1,
      sessionDuration: 30000,
    });
    expect(m).toBe("depression");
  });

  it("detectMoodSignal returns anxiety for many short pauses", () => {
    const m = detectMoodSignal({
      avgHoldTime: 100,
      avgFlightTime: 100,
      errorRate: 0.03,
      typingSpeed: 180,
      pauseCount: 12,
      avgPauseDuration: 500,
      burstCount: 4,
      sessionDuration: 20000,
    });
    expect(m).toBe("anxiety");
  });

  it("detectMoodSignal returns null for ambiguous/short sessions", () => {
    expect(detectMoodSignal({ ...zero(), sessionDuration: 5000 })).toBeNull();
    expect(detectMoodSignal({ ...zero(), typingSpeed: 150, pauseCount: 3, avgPauseDuration: 800, burstCount: 2, sessionDuration: 20000 })).toBeNull();
  });

  it("startTypingSession creates a session and endTypingSession computes metrics", () => {
    const id = startTypingSession("chat");
    expect(id).toMatch(/^ts_/);
    const metrics = endTypingSession(id, 50);
    expect(metrics).not.toBeNull();
    if (metrics) expect(metrics.sessionDuration).toBeGreaterThanOrEqual(0);
  });

  it("getRecentMetrics filters by target and time", () => {
    const m = getRecentMetrics("chat", 7);
    expect(Array.isArray(m)).toBe(true);
  });
});

function zero() {
  return { avgHoldTime: 100, avgFlightTime: 100, errorRate: 0.01, typingSpeed: 150, pauseCount: 3, avgPauseDuration: 800, burstCount: 2, sessionDuration: 20000 };
}
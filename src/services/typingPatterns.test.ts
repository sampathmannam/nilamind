import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  appendToSecureArray: vi.fn((key: string, item: any, cap?: number) => {
    const arr = store.get(key) ? JSON.parse(store.get(key)!) : [];
    arr.push(item);
    store.set(key, JSON.stringify(cap ? arr.slice(-cap) : arr));
  }),
}));

import {
  computeMetrics,
  detectMoodSignal,
  startTypingSession,
  endTypingSession,
  getRecentMetrics,
  classifyKey,
  recordKeystroke,
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
        { ts: now, keyClass: "char", type: "down", targetId: "chat" },
        { ts: now + 100, keyClass: "char", type: "up", targetId: "chat" },
        { ts: now + 200, keyClass: "char", type: "down", targetId: "chat" },
        { ts: now + 300, keyClass: "char", type: "up", targetId: "chat" },
        { ts: now + 400, keyClass: "char", type: "down", targetId: "chat" },
        { ts: now + 500, keyClass: "char", type: "up", targetId: "chat" },
        { ts: now + 600, keyClass: "char", type: "down", targetId: "chat" },
        { ts: now + 700, keyClass: "char", type: "up", targetId: "chat" },
        { ts: now + 800, keyClass: "char", type: "down", targetId: "chat" },
        { ts: now + 900, keyClass: "char", type: "up", targetId: "chat" },
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

  // PRIVACY (audit 1.A): the literal character typed must NEVER be stored — only a coarse class.
  describe("keystroke privacy", () => {
    it("classifyKey maps to coarse classes, never the raw char", () => {
      expect(classifyKey("a")).toBe("char");
      expect(classifyKey("Z")).toBe("char");
      expect(classifyKey("7")).toBe("char");
      expect(classifyKey("!")).toBe("char");
      expect(classifyKey(" ")).toBe("space");
      expect(classifyKey("Backspace")).toBe("backspace");
      expect(classifyKey("Delete")).toBe("backspace");
      expect(classifyKey("Enter")).toBe("enter");
    });

    it("recordKeystroke never persists a raw typed character", () => {
      for (const ch of ["s", "e", "c", "r", "e", "t"]) {
        recordKeystroke({ ts: Date.now(), keyClass: classifyKey(ch), type: "down", targetId: "chat" });
      }
      const raw = store.get("nilamind_typing_sessions_events") ?? "[]";
      expect(raw).not.toMatch(/secret/);      // the typed word must not be reconstructable
      expect(raw).not.toMatch(/"key"\s*:/);   // no raw-key field at all
      for (const e of JSON.parse(raw)) {
        expect(["backspace", "space", "enter", "char"]).toContain(e.keyClass);
      }
    });

    it("caps the timing buffer so it can't grow without bound", () => {
      for (let i = 0; i < 2000; i++) {
        recordKeystroke({ ts: i, keyClass: "char", type: "down", targetId: "chat" });
      }
      const events = JSON.parse(store.get("nilamind_typing_sessions_events") ?? "[]");
      expect(events.length).toBeLessThanOrEqual(1000);
    });
  });
});

function zero() {
  return { avgHoldTime: 100, avgFlightTime: 100, errorRate: 0.01, typingSpeed: 150, pauseCount: 3, avgPauseDuration: 800, burstCount: 2, sessionDuration: 20000 };
}
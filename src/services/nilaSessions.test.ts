import { describe, it, expect, beforeEach, vi } from "vitest";

// Encrypted-persistence backing mocked as a sync in-memory map (mirrors secureLocal), per the convention in
// usageAnalytics.test.ts / protocolProgress.test.ts.
const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  SENSITIVE_KEYS: [] as string[],
  flush: () => {},
}));

import { logNilaTurn, nilaStats, loadNilaTurns } from "./nilaSessions";

beforeEach(() => store.clear());

describe("nilaSessions (2026-07-12: dashboard showed 0 chats after a real session)", () => {
  it("logNilaTurn appends a coach turn and nilaStats counts it in last7", () => {
    logNilaTurn("coach", "hello nila");
    const s = nilaStats();
    expect(s.last7).toBe(1);
    expect(s.total).toBe(1);
  });

  it("caps the stored array", () => {
    for (let i = 0; i < 210; i++) logNilaTurn("coach", `msg ${i}`);
    const all = loadNilaTurns();
    // CAP = 200 in nilaSessions.ts — the oldest entries are dropped, newest kept.
    expect(all.length).toBe(200);
    expect(all[all.length - 1].snippet).toBe("msg 209");
    expect(all[0].snippet).toBe("msg 10"); // first 10 (0..9) fell off the cap
  });

  it("records the surface and truncates the snippet to 80 chars", () => {
    const long = "x".repeat(120);
    logNilaTurn("episode", long);
    const s = nilaStats();
    expect(s.recent[0].surface).toBe("episode");
    expect(s.recent[0].snippet.length).toBe(80);
  });

  it("nilaStats.recent returns newest-first, capped at 8", () => {
    for (let i = 0; i < 10; i++) logNilaTurn("coach", `m${i}`);
    const s = nilaStats();
    expect(s.recent.length).toBe(8);
    expect(s.recent[0].snippet).toBe("m9"); // newest first
    expect(s.recent[7].snippet).toBe("m2");
  });

  it("total counts everything, last7 only counts turns within the last 7 days", () => {
    // Directly seed a stale turn (older than 7 days) plus one fresh turn via logNilaTurn.
    const stale = {
      id: "sg_stale",
      date: "2020-01-01",
      timestamp: "00:00:00",
      surface: "coach" as const,
      snippet: "old turn",
    };
    store.set("nilamind_nila_sessions", JSON.stringify([stale]));
    logNilaTurn("coach", "fresh turn");
    const s = nilaStats();
    expect(s.total).toBe(2);
    expect(s.last7).toBe(1);
  });
});

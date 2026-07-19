import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));

import { resolveToneToggle } from "./clinicianToneOptIn";
import { noteChatAffect, setAffectAccentPersistenceEnabled } from "./chatAffect";

beforeEach(() => {
  store = {};
  setAffectAccentPersistenceEnabled(true);
});

afterEach(() => {
  setAffectAccentPersistenceEnabled(false);
});

function seedDay(now: number, offsetDays: number, valence: number, count: number) {
  const ts = now - offsetDays * 86400000;
  for (let i = 0; i < count; i++) noteChatAffect({ valence, arousal: 0 }, ts);
}

describe("resolveToneToggle — freeze-at-click-time state transition", () => {
  it("unchecking always returns null", () => {
    expect(resolveToneToggle(false, 30)).toBeNull();
  });

  it("checking with insufficient data returns null — the toggle simply doesn't turn on", () => {
    expect(resolveToneToggle(true, 30)).toBeNull();
  });

  it("checking with sufficient data returns a fresh ConversationToneSummary", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2);
    const result = resolveToneToggle(true, 30, now);
    expect(result).not.toBeNull();
    expect(result!.daysUsed).toBe(9);
  });

  it("is a fresh call each time — reflects data written between two calls, not a cached value (the null-at-click race regression guard)", () => {
    const now = Date.now();
    expect(resolveToneToggle(true, 7, now)).toBeNull(); // no data yet
    for (let d = 0; d < 3; d++) seedDay(now, d, -0.5, 4); // now clears the 7-day window's floor
    const second = resolveToneToggle(true, 7, now);
    expect(second).not.toBeNull(); // same function, same args, DIFFERENT real-world state → different result
  });
});

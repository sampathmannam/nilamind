import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));

import { buildAffectToneStrip } from "./affectToneChart";
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

describe("buildAffectToneStrip — pure data-shaping for the mood-tone chart", () => {
  it("sufficient is false with no data", () => {
    expect(buildAffectToneStrip(Date.now()).sufficient).toBe(false);
  });

  it("sufficient is false below computeConversationToneSummary's own dual floor", () => {
    const now = Date.now();
    seedDay(now, 0, -0.5, 1);
    seedDay(now, 1, -0.5, 1);
    seedDay(now, 2, -0.5, 1);
    expect(buildAffectToneStrip(now).sufficient).toBe(false);
  });

  it("sufficient is true once the dual floor clears", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2);
    expect(buildAffectToneStrip(now).sufficient).toBe(true);
  });

  it("sufficient is false when persistence reads are disabled, even with data present", () => {
    const now = Date.now();
    for (let d = 0; d < 9; d++) seedDay(now, d, -0.5, 2);
    setAffectAccentPersistenceEnabled(false);
    expect(buildAffectToneStrip(now).sufficient).toBe(false);
  });

  it("cells are chronological (oldest first), not recentAffectDays' native most-recent-first order", () => {
    const now = Date.now();
    seedDay(now, 2, -0.9, 2);
    seedDay(now, 1, 0.0, 2);
    seedDay(now, 0, 0.5, 2);
    const { cells } = buildAffectToneStrip(now);
    expect(cells.map((c) => c.date)).toEqual([...cells.map((c) => c.date)].sort());
  });

  it("sparse days are simply absent from cells, never a zero-valence placeholder", () => {
    const now = Date.now();
    seedDay(now, 5, -0.5, 2);
    seedDay(now, 0, 0.5, 2);
    const { cells } = buildAffectToneStrip(now);
    expect(cells.length).toBe(2);
    expect(cells.some((c) => c.valence === 0)).toBe(false);
  });
});

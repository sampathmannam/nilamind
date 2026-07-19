import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));

import { noteChatAffect } from "./chatAffect";

const KEY = "nilamind_chat_affect";

beforeEach(() => { store = {}; });

describe("chatAffect — write-only latch for the last per-turn affect reading (Phase 1)", () => {
  it("writes nothing before any note", () => {
    expect(store[KEY]).toBeUndefined();
  });

  it("notes a reading with a timestamp", () => {
    noteChatAffect({ valence: 0.4, arousal: -0.2 }, 1000);
    const stored = JSON.parse(store[KEY]);
    expect(stored).toEqual({ valence: 0.4, arousal: -0.2, at: 1000 });
  });

  it("a later note overwrites the previous reading", () => {
    noteChatAffect({ valence: 0.4, arousal: -0.2 }, 1000);
    noteChatAffect({ valence: -0.6, arousal: 0.5 }, 2000);
    const stored = JSON.parse(store[KEY]);
    expect(stored).toEqual({ valence: -0.6, arousal: 0.5, at: 2000 });
  });

  it("defaults `now` to Date.now() when omitted", () => {
    const before = Date.now();
    noteChatAffect({ valence: 0.1, arousal: 0.1 });
    const stored = JSON.parse(store[KEY]);
    expect(stored.at).toBeGreaterThanOrEqual(before);
  });
});

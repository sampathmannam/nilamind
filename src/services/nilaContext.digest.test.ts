import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  SENSITIVE_KEYS: [],
  flush: () => {},
}));

import { buildReflectionDigest } from "./nilaContext";
import { setAffectAccentPersistenceEnabled } from "./chatAffect";
import { localDateKey } from "./storageUtils";

const today = new Date();
const iso = (d: Date) => d.toISOString().split("T")[0];

beforeEach(() => {
  store.clear();
  store.set("nilamind_checkins", JSON.stringify([
    { date: iso(today), emotion: "Anxious", intensity: 7, context: "SECRET_CONTEXT_XYZ" },
    { date: iso(today), emotion: "Anxious", intensity: 5, context: "more secret" },
  ]));
  store.set("nilamind_episodes", JSON.stringify([
    { date: iso(today), timeOfDay: "evening", trigger: "SECRET_TRIGGER_XYZ", skillsHelpful: ["Box breathing"] },
  ]));
  store.set("nilamind_diary", JSON.stringify({
    [iso(today)]: { date: iso(today), quickNotes: "SECRET_NOTE_XYZ", morningIntention: "SECRET_INTENT_XYZ", skillsUsed: ["TIPP"], emotions: { misery: 1, shame: 0, anger: 0, fear: 2, joy: 1, love: 1 } },
  }));
});

describe("buildReflectionDigest", () => {
  it("emits derived signal", () => {
    const d = buildReflectionDigest();
    expect(d).toContain("Check-ins");
    expect(d.toLowerCase()).toContain("anxious");
    expect(d).toContain("TIPP"); // diary-logged skill IS read (object-shaped store)
  });
  it("NEVER contains raw free-text fields", () => {
    const d = buildReflectionDigest();
    for (const secret of ["SECRET_CONTEXT_XYZ", "more secret", "SECRET_TRIGGER_XYZ", "SECRET_NOTE_XYZ", "SECRET_INTENT_XYZ"]) {
      expect(d).not.toContain(secret);
    }
  });
  it("returns '' when there is no history", () => {
    store.clear();
    expect(buildReflectionDigest()).toBe("");
  });
});

afterEach(() => {
  setAffectAccentPersistenceEnabled(false); // restore the real default so it can't leak into other test files
});

describe("buildReflectionDigest — Conversation tone line (Phase 2)", () => {
  beforeEach(() => { store.clear(); }); // isolate from the sibling describe block's fixtures — don't rely on run order

  function setAffectHistory(days: number) {
    const now = Date.now();
    const history: Record<string, { valence: number; arousal: number; count: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now - i * 86400000);
      history[localDateKey(d)] = { valence: -0.6, arousal: 0.1, count: 5 };
    }
    store.set("nilamind_chat_affect", JSON.stringify(history));
  }

  it("is absent when persistence reads are disabled, even with data present", () => {
    setAffectHistory(4); // persistence flag left at its real default (disabled) — not enabled in this test
    expect(buildReflectionDigest()).not.toContain("Conversation tone");
  });

  it("is absent below the 3-distinct-day floor", () => {
    setAffectAccentPersistenceEnabled(true);
    setAffectHistory(2);
    expect(buildReflectionDigest()).not.toContain("Conversation tone");
  });

  it("appears with the trend word and provenance framing, never a raw number, once the floor is cleared", () => {
    setAffectAccentPersistenceEnabled(true);
    setAffectHistory(4);
    const d = buildReflectionDigest();
    expect(d).toContain("Conversation tone");
    expect(d).toContain("trended difficult");
    expect(d).toContain("automatic tone estimate");
    expect(d).toContain("trust what they said");
    const toneLine = d.split("\n").find((l) => l.includes("Conversation tone"));
    expect(toneLine).toBeDefined();
    expect(toneLine).not.toMatch(/-?\d\.\d/); // no raw decimal number in the tone line specifically
  });
});

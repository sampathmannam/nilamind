import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import {
  getIntention,
  setIntention,
  getDailyIntention,
  setDailyIntention,
  clearDailyIntention,
} from "./weeklyIntention";

// Wave 3 Group I — weeklyIntention.ts gains a DAILY if-then implementation-intention store,
// per Gollwitzer & Sheeran (2006), Adv Exp Soc Psychol (d=0.65 goal attainment, d=0.61 overcoming
// failure-to-start). This is the ONE canonical store the chat-embedded question (modeEngine.ts) and
// the diary free-text field (DiaryCardScreen.tsx) both now defer to, instead of three independent,
// contradictory "intention" surfaces.
describe("weeklyIntention — daily if-then intention", () => {
  beforeEach(() => {
    store.clear();
  });

  it("returns null when no daily intention has been set", () => {
    expect(getDailyIntention()).toBeNull();
  });

  it("sets and persists a daily if-then intention", () => {
    const result = setDailyIntention("I feel anxious after lunch", "do a 2-minute breathing exercise");
    expect(result).not.toBeNull();
    expect(result!.if).toBe("I feel anxious after lunch");
    expect(result!.then).toBe("do a 2-minute breathing exercise");
    expect(result!.date).toBe(new Date().toISOString().split("T")[0]);

    const loaded = getDailyIntention();
    expect(loaded).toEqual(result);
  });

  it("trims whitespace on both fields", () => {
    const result = setDailyIntention("  it's 8am  ", "  go for a short walk  ");
    expect(result!.if).toBe("it's 8am");
    expect(result!.then).toBe("go for a short walk");
  });

  it("refuses to save (returns null, persists nothing) when the 'if' field is empty", () => {
    const result = setDailyIntention("   ", "do a breathing exercise");
    expect(result).toBeNull();
    expect(getDailyIntention()).toBeNull();
  });

  it("refuses to save (returns null, persists nothing) when the 'then' field is empty", () => {
    const result = setDailyIntention("it's 8am", "   ");
    expect(result).toBeNull();
    expect(getDailyIntention()).toBeNull();
  });

  it("expires a daily intention set on a previous day", () => {
    setDailyIntention("it's 8am", "go for a short walk");
    // Simulate a stale entry from yesterday by writing raw storage directly.
    const stale = { if: "it's 8am", then: "go for a short walk", date: "2000-01-01" };
    store.set("nilamind_daily_intention", JSON.stringify(stale));
    expect(getDailyIntention()).toBeNull();
  });

  it("clearDailyIntention removes the stored intention", () => {
    setDailyIntention("it's 8am", "go for a short walk");
    expect(getDailyIntention()).not.toBeNull();
    clearDailyIntention();
    expect(getDailyIntention()).toBeNull();
  });

  it("does not collide with the existing weekly intention store", () => {
    setIntention("Do a grounding exercise daily");
    setDailyIntention("it's 8am", "go for a short walk");
    expect(getIntention()?.text).toBe("Do a grounding exercise daily");
    expect(getDailyIntention()?.if).toBe("it's 8am");
  });
});

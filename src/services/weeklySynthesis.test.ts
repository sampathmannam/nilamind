import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  appendToSecureArray: vi.fn(),
}));

vi.mock("./streaks", () => ({ computeCompassionateStreak: vi.fn(() => ({ current: 3, longest: 7 })) }));
vi.mock("./protocolProgress", () => ({ getActiveProgress: vi.fn(() => null) }));
vi.mock("./sleepInsight", () => ({ selfReportSleepSignal: vi.fn(() => null) }));
vi.mock("./storageUtils", () => ({ ls: vi.fn(() => null), DAY_MS: 86400000 }));

import { extractWeeklyFacts, weeklySynthesisPrompt, shouldRunSynthesis, recordSynthesisTimestamp, lastSynthesisTimestamp } from "./weeklySynthesis";

describe("extractWeeklyFacts", () => {
  beforeEach(() => { store.clear(); });

  it("returns zeroes when no data", () => {
    const f = extractWeeklyFacts();
    expect(f.checkinCount).toBe(0);
    expect(f.topEmotion).toBeNull();
    expect(f.avgIntensity).toBeNull();
    expect(f.skillsUsed).toEqual([]);
  });

  it("counts recent checkins and computes top emotion", () => {
    const today = new Date().toISOString().split("T")[0];
    store.set("nilamind_checkins", JSON.stringify([
      { date: today, emotion: "Anxious (Nila)", intensity: 6 },
    ]));
    const f = extractWeeklyFacts();
    expect(f.checkinCount).toBe(1);
    expect(f.topEmotion).toBe("anxious");
    expect(f.avgIntensity).toBe(6);
  });

  it("excludes checkins older than 7 days", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);
    store.set("nilamind_checkins", JSON.stringify([
      { date: oldDate.toISOString().split("T")[0], emotion: "Calm", intensity: 2 },
    ]));
    const f = extractWeeklyFacts();
    expect(f.checkinCount).toBe(0);
  });

  it("never reads free-text fields from check-ins", () => {
    const today = new Date().toISOString().split("T")[0];
    store.set("nilamind_checkins", JSON.stringify([
      { date: today, emotion: "Low (Nila)", intensity: 5, context: "PRIVATE_SECRET_TEXT" },
    ]));
    const f = extractWeeklyFacts();
    expect(JSON.stringify(f)).not.toContain("PRIVATE_SECRET_TEXT");
  });

  it("extracts skills from diary and episodes", () => {
    const today = new Date().toISOString().split("T")[0];
    store.set("nilamind_diary", JSON.stringify({
      [today]: { date: today, skillsUsed: ["TIPP", "Box Breathing"] },
    }));
    store.set("nilamind_episodes", JSON.stringify([
      { date: today, skillsHelpful: ["Radical Acceptance"] },
    ]));
    const f = extractWeeklyFacts();
    expect(f.skillsUsed).toContain("TIPP");
    expect(f.skillsUsed).toContain("Radical Acceptance");
  });
});

describe("shouldRunSynthesis", () => {
  beforeEach(() => { store.clear(); });

  it("returns true when no prior synthesis", () => {
    expect(shouldRunSynthesis()).toBe(true);
  });

  it("returns false when synthesis was within 7 days", () => {
    store.set("nilamind_weekly_synthesis", JSON.stringify({ at: Date.now() - 86400_000 }));
    expect(shouldRunSynthesis()).toBe(false);
  });

  it("returns true when synthesis was over 7 days ago", () => {
    store.set("nilamind_weekly_synthesis", JSON.stringify({ at: Date.now() - 8 * 86400_000 }));
    expect(shouldRunSynthesis()).toBe(true);
  });
});

describe("weeklySynthesisPrompt", () => {
  it("generates a prompt containing key facts", () => {
    const p = weeklySynthesisPrompt({
      checkinCount: 3, distinctEmotions: ["low", "anxious"], topEmotion: "low",
      avgIntensity: 5.2, skillsUsed: ["TIPP"], streak: 4, activeProtocol: null,
      sleepFiring: false, napNote: null, episodes: 0, lastSynthesisDay: null,
    });
    expect(p).toContain("3 times");
    expect(p).toContain("low");
    expect(p).toContain("TIPP");
    expect(p).toContain("4 days");
  });

  it("handles empty facts gracefully", () => {
    const p = weeklySynthesisPrompt({
      checkinCount: 0, distinctEmotions: [], topEmotion: null,
      avgIntensity: null, skillsUsed: [], streak: 0, activeProtocol: null,
      sleepFiring: false, napNote: null, episodes: 0, lastSynthesisDay: null,
    });
    expect(p).toContain("Here is what happened this week");
  });
});

describe("recordSynthesisTimestamp", () => {
  beforeEach(() => { store.clear(); });

  it("persists a timestamp", () => {
    recordSynthesisTimestamp();
    const raw = store.get("nilamind_weekly_synthesis");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).at).toBeGreaterThan(Date.now() - 5000);
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import { createProfile, loadProfile, saveProfile, loadSessions, saveSession, prewrittenTemplates, sessionStreak, averageMoodImprovement } from "./peerSupport";

describe("peerSupport", () => {
  beforeEach(() => { store.clear(); });

  it("createProfile returns a structured profile", () => {
    const p = createProfile("early recovery", ["anxiety", "isolation"], "listener", "evenings");
    expect(p.id).toMatch(/^pp_/);
    expect(p.goals).toContain("anxiety");
  });

  it("save and load profile round-trip", () => {
    const p = createProfile("stable", ["connection"], "sharer", "mornings");
    saveProfile(p);
    const loaded = loadProfile();
    expect(loaded?.stage).toBe("stable");
  });

  it("loadProfile returns null when empty", () => {
    expect(loadProfile()).toBeNull();
  });

  it("saveSession and loadSessions round-trip", () => {
    saveSession({ id: "s1", date: "2026-07-06", contactName: "Friend", moodBefore: 6, moodAfter: 4, connected: true, notes: "helped" });
    saveSession({ id: "s2", date: "2026-07-07", contactName: "Family", moodBefore: 5, moodAfter: 3, connected: true, notes: "" });
    expect(loadSessions()).toHaveLength(2);
  });

  it("prewrittenTemplates returns 4 templates", () => {
    const t = prewrittenTemplates();
    expect(t).toHaveLength(4);
    expect(t[0].label).toBeTruthy();
    expect(t[0].text).toContain("hard time");
  });

  it("sessionStreak counts consecutive connected sessions", () => {
    saveSession({ id: "s1", date: "2026-07-06", contactName: "A", moodBefore: 5, moodAfter: null, connected: true, notes: "" });
    saveSession({ id: "s2", date: "2026-07-07", contactName: "A", moodBefore: 4, moodAfter: null, connected: true, notes: "" });
    saveSession({ id: "s3", date: "2026-07-08", contactName: "B", moodBefore: 6, moodAfter: null, connected: false, notes: "" });
    expect(sessionStreak(loadSessions())).toBe(0); // most recent is not connected
  });

  it("averageMoodImprovement computes mood change", () => {
    saveSession({ id: "s1", date: "2026-07-06", contactName: "A", moodBefore: 6, moodAfter: 4, connected: true, notes: "" });
    saveSession({ id: "s2", date: "2026-07-07", contactName: "A", moodBefore: 5, moodAfter: 3, connected: true, notes: "" });
    expect(averageMoodImprovement(loadSessions())).toBe(-2);
  });
});

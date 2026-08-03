import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import {
  createProfile,
  loadProfile,
  saveProfile,
  loadSessions,
  saveSession,
  prewrittenTemplates,
  sessionStreak,
  averageMoodImprovement,
  type PeerSession,
} from "./peerSupport";

beforeEach(() => store.clear());

describe("peerSupport", () => {
  describe("createProfile", () => {
    it("returns object with all required fields", () => {
      const p = createProfile("early", ["connection"], "gentle", "weekends");
      expect(p).toHaveProperty("id");
      expect(p).toHaveProperty("createdAt");
      expect(p.stage).toBe("early");
      expect(p.goals).toEqual(["connection"]);
      expect(p.style).toBe("gentle");
      expect(p.availability).toBe("weekends");
      expect(p.id).toMatch(/^pp_/);
    });
  });

  describe("loadProfile / saveProfile", () => {
    it("round-trips profile", () => {
      const p = createProfile("mid", ["reduce stress"], "direct", "anytime");
      saveProfile(p);
      const loaded = loadProfile();
      expect(loaded).toEqual(p);
    });

    it("returns null when no profile saved", () => {
      expect(loadProfile()).toBeNull();
    });
  });

  describe("loadSessions / saveSession", () => {
    it("round-trips sessions", () => {
      const s: PeerSession = {
        id: "ps_1",
        date: "2026-07-01",
        contactName: "Alex",
        moodBefore: 3,
        moodAfter: 6,
        connected: true,
        notes: "good chat",
      };
      saveSession(s);
      const sessions = loadSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toEqual(s);
    });

    it("accumulates multiple sessions", () => {
      const s1: PeerSession = { id: "ps_1", date: "2026-07-01", contactName: "A", moodBefore: 3, moodAfter: 5, connected: true, notes: "" };
      const s2: PeerSession = { id: "ps_2", date: "2026-07-02", contactName: "B", moodBefore: 4, moodAfter: null, connected: false, notes: "" };
      saveSession(s1);
      saveSession(s2);
      expect(loadSessions()).toHaveLength(2);
    });
  });

  describe("prewrittenTemplates", () => {
    it("returns 4 templates", () => {
      const t = prewrittenTemplates();
      expect(t).toHaveLength(4);
    });

    it("each template has id, label, text", () => {
      for (const t of prewrittenTemplates()) {
        expect(t).toHaveProperty("id");
        expect(t).toHaveProperty("label");
        expect(t).toHaveProperty("text");
        expect(typeof t.id).toBe("string");
        expect(typeof t.label).toBe("string");
        expect(typeof t.text).toBe("string");
      }
    });
  });

  describe("sessionStreak", () => {
    it("counts consecutive connected sessions from most recent", () => {
      const sessions: PeerSession[] = [
        { id: "1", date: "2026-07-03", contactName: "A", moodBefore: 3, moodAfter: 5, connected: true, notes: "" },
        { id: "2", date: "2026-07-02", contactName: "A", moodBefore: 4, moodAfter: 6, connected: true, notes: "" },
        { id: "3", date: "2026-07-01", contactName: "A", moodBefore: 3, moodAfter: 3, connected: false, notes: "" },
      ];
      expect(sessionStreak(sessions)).toBe(2);
    });

    it("returns 0 when most recent session was not connected", () => {
      const sessions: PeerSession[] = [
        { id: "1", date: "2026-07-03", contactName: "A", moodBefore: 3, moodAfter: null, connected: false, notes: "" },
        { id: "2", date: "2026-07-02", contactName: "A", moodBefore: 4, moodAfter: 6, connected: true, notes: "" },
      ];
      expect(sessionStreak(sessions)).toBe(0);
    });

    it("returns 0 for empty sessions", () => {
      expect(sessionStreak([])).toBe(0);
    });
  });

  describe("averageMoodImprovement", () => {
    it("computes mean mood improvement across complete sessions", () => {
      const sessions: PeerSession[] = [
        { id: "1", date: "2026-07-01", contactName: "A", moodBefore: 3, moodAfter: 5, connected: true, notes: "" },
        { id: "2", date: "2026-07-02", contactName: "A", moodBefore: 4, moodAfter: 6, connected: true, notes: "" },
      ];
      expect(averageMoodImprovement(sessions)).toBe(2);
    });

    it("ignores incomplete sessions (not connected or moodAfter null)", () => {
      const sessions: PeerSession[] = [
        { id: "1", date: "2026-07-01", contactName: "A", moodBefore: 3, moodAfter: 5, connected: true, notes: "" },
        { id: "2", date: "2026-07-02", contactName: "A", moodBefore: 4, moodAfter: null, connected: true, notes: "" },
        { id: "3", date: "2026-07-03", contactName: "A", moodBefore: 2, moodAfter: 8, connected: false, notes: "" },
      ];
      expect(averageMoodImprovement(sessions)).toBe(2);
    });

    it("returns null when no complete sessions", () => {
      const sessions: PeerSession[] = [
        { id: "1", date: "2026-07-01", contactName: "A", moodBefore: 3, moodAfter: null, connected: true, notes: "" },
      ];
      expect(averageMoodImprovement(sessions)).toBeNull();
    });

    it("returns null for empty sessions", () => {
      expect(averageMoodImprovement([])).toBeNull();
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory secureLocal mock (vi.mock is hoisted; the store map is referenced inside the factory).
const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import { buildCheckinEntry, appendCheckin, hasCheckinToday, getSkipFlag, setSkipFlag } from "./checkin";
import type { CheckInEntry } from "../types";

// Plain localStorage stub (node env has none).
const ls = new Map<string, string>();
beforeEach(() => {
  store.clear();
  ls.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (ls.has(k) ? (ls.get(k) as string) : null),
    setItem: (k: string, v: string) => { ls.set(k, String(v)); },
    removeItem: (k: string) => { ls.delete(k); },
  };
});

describe("buildCheckinEntry", () => {
  it("builds the exact CheckInEntry shape with the (Nila) suffix", () => {
    const e = buildCheckinEntry("Anxious", 7, "Work");
    expect(e.id).toMatch(/^ch_\d+$/);
    expect(e.date).toBe(new Date().toISOString().split("T")[0]);
    expect(typeof e.timestamp).toBe("string");
    expect(e.timestamp.length).toBeGreaterThan(0);
    expect(e.emotion).toBe("Anxious (Nila)");
    expect(e.intensity).toBe(7);
    expect(e.context).toBe("Work");
    expect("sleepHours" in e).toBe(false);
    expect("socialInteraction" in e).toBe(false);
  });
  it("falls back to 'Nila check-in' context when contextTag is null", () => {
    expect(buildCheckinEntry("Low", 5, null).context).toBe("Nila check-in");
  });
  it("treats an empty-string contextTag as no tag", () => {
    expect(buildCheckinEntry("Low", 5, "").context).toBe("Nila check-in");
  });
});

describe("appendCheckin", () => {
  const mk = (date: string, emotion = "Low"): CheckInEntry =>
    ({ id: "ch_" + Math.random(), date, timestamp: "t", emotion, intensity: 5, context: "x" });

  it("appends to an empty store (one write, one entry)", () => {
    appendCheckin(mk("2026-06-21"));
    const raw = store.get("nilamind_checkins");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string)).toHaveLength(1);
  });
  it("appends without overwriting existing entries", () => {
    store.set("nilamind_checkins", JSON.stringify([mk("2026-06-20", "Calm")]));
    appendCheckin(mk("2026-06-21", "Anxious"));
    const list = JSON.parse(store.get("nilamind_checkins") as string);
    expect(list).toHaveLength(2);
    expect(list[0].emotion).toBe("Calm");
    expect(list[1].emotion).toBe("Anxious");
  });
  it("writes exactly once per call", () => {
    const spy = vi.spyOn(store, "set");
    appendCheckin(mk("2026-06-21"));
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
  it("recovers from a corrupt array by starting fresh", () => {
    store.set("nilamind_checkins", "{not json");
    appendCheckin(mk("2026-06-21"));
    expect(JSON.parse(store.get("nilamind_checkins") as string)).toHaveLength(1);
  });
});

describe("hasCheckinToday", () => {
  it("is true when any entry has date === today", () => {
    store.set("nilamind_checkins", JSON.stringify([
      { id: "a", date: "2026-06-20", timestamp: "t", emotion: "Calm", intensity: 3, context: "x" },
      { id: "b", date: "2026-06-21", timestamp: "t", emotion: "Low", intensity: 5, context: "x" },
    ]));
    expect(hasCheckinToday("2026-06-21")).toBe(true);
  });
  it("is false when no entry matches today", () => {
    store.set("nilamind_checkins", JSON.stringify([
      { id: "a", date: "2026-06-20", timestamp: "t", emotion: "Calm", intensity: 3, context: "x" },
    ]));
    expect(hasCheckinToday("2026-06-21")).toBe(false);
  });
  it("is false on empty / missing / corrupt store", () => {
    expect(hasCheckinToday("2026-06-21")).toBe(false);
    store.set("nilamind_checkins", "garbage");
    expect(hasCheckinToday("2026-06-21")).toBe(false);
  });
});

describe("skip flag (plain localStorage, non-sensitive)", () => {
  it("round-trips the today value under nilamind_checkin_skipped", () => {
    expect(getSkipFlag()).toBeNull();
    setSkipFlag("2026-06-21");
    expect(ls.get("nilamind_checkin_skipped")).toBe("2026-06-21");
    expect(getSkipFlag()).toBe("2026-06-21");
  });
});

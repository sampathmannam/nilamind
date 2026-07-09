import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import { loadMoodHistory } from "./moodHistory";

describe("loadMoodHistory — chronological order (audit #18)", () => {
  beforeEach(() => store.clear());

  it("returns MoodPoints sorted by date even when a diary-only date predates the last check-in", () => {
    // Check-ins Jun 29 + Jul 9; a diary-only card on Jul 4 (no check-in that day) is appended last by insertion.
    store.set("nilamind_checkins", JSON.stringify([
      { date: "2026-06-29", intensity: 5 },
      { date: "2026-07-09", intensity: 6 },
    ]));
    store.set("nilamind_diary", JSON.stringify({ "2026-07-04": { emotions: { shame: 3 } } }));

    const h = loadMoodHistory();
    expect(h.map((p) => p.date)).toEqual(["2026-06-29", "2026-07-04", "2026-07-09"]);
    // the tail must be the truly most-recent day (callers use moodHist[last] as "last check-in")
    expect(h[h.length - 1].date).toBe("2026-07-09");
  });
});

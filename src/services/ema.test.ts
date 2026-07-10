import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadEmaEntries,
  saveEmaEntry,
  generateEmaWindows,
  emaElevationSignal,
  randomTimeInWindow,
  planEmaFireTimes,
  type EmaWindow,
} from "./ema";

// EMA notes are encrypted at rest — the engine persists via secureLocal, so mock that (not localStorage).
const mockStore = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => mockStore.get(k) ?? null,
    setItem: (k: string, v: string) => { mockStore.set(k, v); },
    removeItem: (k: string) => { mockStore.delete(k); },
  },
}));

beforeEach(() => mockStore.clear());

describe("loadEmaEntries / saveEmaEntry", () => {
  it("returns empty array when no entries stored", () => {
    expect(loadEmaEntries()).toEqual([]);
  });

  it("saves and loads a single EMA entry", () => {
    const entry = {
      id: "test-1",
      date: "2026-07-10",
      timestamp: "2026-07-10T14:00:00.000Z",
      valence: 2,
      energy: 3,
      note: "feeling good",
      trigger: "random" as const,
    };
    saveEmaEntry(entry);
    const loaded = loadEmaEntries();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("test-1");
    expect(loaded[0].valence).toBe(2);
  });

  it("preserves multiple entries across saves", () => {
    saveEmaEntry({ id: "a", date: "2026-07-10", timestamp: "2026-07-10T10:00:00.000Z", valence: 1, trigger: "random" });
    saveEmaEntry({ id: "b", date: "2026-07-10", timestamp: "2026-07-10T14:00:00.000Z", valence: -1, trigger: "random" });
    expect(loadEmaEntries()).toHaveLength(2);
  });

  it("handles corrupt storage gracefully", () => {
    mockStore.set("nilamind_ema", "corrupt json");
    expect(loadEmaEntries()).toEqual([]);
  });

  it("stores the entry with the correct key", () => {
    saveEmaEntry({ id: "k", date: "2026-07-10", timestamp: "2026-07-10T10:00:00.000Z", valence: 0, trigger: "random" });
    expect(mockStore.has("nilamind_ema")).toBe(true);
    const raw = mockStore.get("nilamind_ema");
    expect(JSON.parse(raw!)).toHaveLength(1);
  });
});

describe("generateEmaWindows", () => {
  it("generates windows with correct defaults", () => {
    const windows = generateEmaWindows();
    expect(windows).toHaveLength(2);
    expect(windows[0].start).toContain(":");
    expect(windows[1].end).toContain(":");
  });

  it("allows custom frequency", () => {
    const windows = generateEmaWindows(3);
    expect(windows).toHaveLength(3);
  });

  it("allows custom time windows", () => {
    const custom: EmaWindow[] = [
      { start: "08:00", end: "09:00" },
      { start: "20:00", end: "21:00" },
    ];
    const windows = generateEmaWindows(2, custom);
    expect(windows[0].start).toBe("08:00");
    expect(windows[1].end).toBe("21:00");
  });
});

describe("emaElevationSignal", () => {
  it("returns 'none' when no entries", () => {
    expect(emaElevationSignal()).toBe("none");
  });

  it("returns 'none' when entries are not elevated", () => {
    saveEmaEntry({ id: "a", date: "2026-07-10", timestamp: "2026-07-10T10:00:00.000Z", valence: 0, energy: 2, trigger: "random" });
    saveEmaEntry({ id: "b", date: "2026-07-10", timestamp: "2026-07-10T14:00:00.000Z", valence: 1, energy: 2, trigger: "random" });
    expect(emaElevationSignal()).toBe("none");
  });

  it("returns 'elevated' when valence + energy trend is moderate across same day", () => {
    // First entry mild
    saveEmaEntry({ id: "a", date: "2026-07-10", timestamp: "2026-07-10T08:00:00.000Z", valence: 0, energy: 2, trigger: "random" });
    // Second entry rising moderately
    saveEmaEntry({ id: "b", date: "2026-07-10", timestamp: "2026-07-10T12:00:00.000Z", valence: 2, energy: 3, trigger: "random" });
    expect(emaElevationSignal()).toBe("elevated");
  });

  it("returns 'high' when steep rise across same day", () => {
    saveEmaEntry({ id: "a", date: "2026-07-10", timestamp: "2026-07-10T08:00:00.000Z", valence: -1, energy: 1, trigger: "random" });
    saveEmaEntry({ id: "b", date: "2026-07-10", timestamp: "2026-07-10T14:00:00.000Z", valence: 3, energy: 4, trigger: "random" });
    expect(emaElevationSignal()).toBe("high");
  });

  it("ignores entries from different days", () => {
    saveEmaEntry({ id: "a", date: "2026-07-09", timestamp: "2026-07-09T08:00:00.000Z", valence: 3, energy: 4, trigger: "random" });
    saveEmaEntry({ id: "b", date: "2026-07-10", timestamp: "2026-07-10T10:00:00.000Z", valence: 1, energy: 2, trigger: "random" });
    expect(emaElevationSignal()).toBe("none");
  });

  it("handles entries with missing energy", () => {
    saveEmaEntry({ id: "a", date: "2026-07-10", timestamp: "2026-07-10T08:00:00.000Z", valence: 2, trigger: "random" });
    expect(emaElevationSignal()).toBe("none");
  });
});

describe("randomTimeInWindow", () => {
  const day = new Date(2026, 6, 10);
  it("returns the window start at rng=0 and the end at rng→1", () => {
    const win: EmaWindow = { start: "10:00", end: "12:00" };
    const lo = randomTimeInWindow(win, day, () => 0);
    expect(lo.getHours()).toBe(10);
    expect(lo.getMinutes()).toBe(0);
    const hi = randomTimeInWindow(win, day, () => 0.999999);
    expect(hi.getHours()).toBe(12);
    expect(hi.getMinutes()).toBe(0);
  });
  it("always lands inside the window", () => {
    const win: EmaWindow = { start: "14:00", end: "16:00" };
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      const t = randomTimeInWindow(win, day, () => r);
      const min = t.getHours() * 60 + t.getMinutes();
      expect(min).toBeGreaterThanOrEqual(14 * 60);
      expect(min).toBeLessThanOrEqual(16 * 60);
    }
  });
});

describe("planEmaFireTimes", () => {
  it("plans frequency×days future times, sorted", () => {
    const now = new Date(2026, 6, 10, 6, 0, 0); // 6am, before all windows
    const times = planEmaFireTimes({ frequency: 2, days: 3, now, rng: () => 0.5 });
    expect(times).toHaveLength(6); // 2 windows/day × 3 days
    for (const t of times) expect(t.getTime()).toBeGreaterThan(now.getTime());
    expect(times).toEqual([...times].sort((a, b) => a.getTime() - b.getTime()));
  });

  it("never schedules into quiet hours (drops the slot instead of clamping)", () => {
    const now = new Date(2026, 6, 10, 6, 0, 0);
    const isQuiet = (d: Date) => d.getHours() >= 19; // evening window is quiet
    const times = planEmaFireTimes({ frequency: 3, days: 1, now, rng: () => 0.5, isQuiet });
    expect(times.every((t) => t.getHours() < 19)).toBe(true);
    expect(times).toHaveLength(2); // morning + afternoon kept; evening dropped
  });

  it("drops past times so a mid-day re-sync never backdates a ping", () => {
    const now = new Date(2026, 6, 10, 15, 0, 0); // 3pm
    const times = planEmaFireTimes({ frequency: 3, days: 1, now, rng: () => 0.5 });
    expect(times.every((t) => t.getTime() > now.getTime())).toBe(true);
  });
});

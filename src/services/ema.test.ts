import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadEmaEntries,
  saveEmaEntry,
  generateEmaWindows,
  emaElevationSignal,
  type EmaWindow,
} from "./ema";

const mockStore = new Map<string, string>();

beforeEach(() => {
  mockStore.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => mockStore.get(k) ?? null,
    setItem: (k: string, v: string) => mockStore.set(k, v),
    removeItem: (k: string) => mockStore.delete(k),
    clear: () => mockStore.clear(),
  });
});

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

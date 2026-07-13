import { vi, describe, it, expect, beforeEach } from "vitest";
const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  appendToSecureArray: <T>(key: string, item: T) => {
    const arr: T[] = store.has(key) ? JSON.parse(store.get(key)!) : [];
    arr.push(item);
    store.set(key, JSON.stringify(arr));
    return arr;
  },
}));
import {
  addEpisodeMarker,
  readEpisodeMarkers,
  currentPhase,
  episodeMarkerSummary,
  validateMarker,
  type EpisodeMarker,
  type EpisodePhase,
} from "./episodeMarker";

beforeEach(() => store.clear());

function marker(over: Partial<EpisodeMarker> = {}): EpisodeMarker {
  return {
    id: "m1",
    startDate: "2026-03-01",
    endDate: "2026-03-15",
    phase: "elevated",
    note: "",
    createdAt: "2026-03-01T10:00:00",
    ...over,
  };
}

describe("validateMarker", () => {
  it("accepts a valid range", () => {
    expect(validateMarker(marker())).toBe(true);
  });
  it("accepts a single-day marker", () => {
    expect(validateMarker(marker({ startDate: "2026-03-01", endDate: "2026-03-01" }))).toBe(true);
  });
  it("rejects an inverted range", () => {
    expect(validateMarker(marker({ startDate: "2026-03-15", endDate: "2026-03-01" }))).toBe(false);
  });
  it("rejects an unknown phase", () => {
    expect(validateMarker(marker({ phase: "weird" as EpisodePhase }))).toBe(false);
  });
});

describe("addEpisodeMarker / readEpisodeMarkers", () => {
  it("round-trips through the encrypted array", () => {
    const all = addEpisodeMarker(marker({ id: "a", startDate: "2026-01-01", endDate: "2026-01-10", phase: "depressed" }));
    expect(all.length).toBe(1);
    expect(readEpisodeMarkers().length).toBe(1);
    expect(readEpisodeMarkers()[0].phase).toBe("depressed");
  });
  it("rejects an invalid range without persisting", () => {
    expect(() => addEpisodeMarker(marker({ startDate: "2026-03-15", endDate: "2026-03-01" }))).toThrow();
    expect(readEpisodeMarkers().length).toBe(0);
  });
});

describe("currentPhase", () => {
  it("returns the marker covering today", () => {
    const all = [
      marker({ id: "a", startDate: "2026-03-01", endDate: "2026-03-20", phase: "elevated" }),
      marker({ id: "b", startDate: "2026-04-01", endDate: "2026-04-10", phase: "depressed" }),
    ];
    expect(currentPhase(all, "2026-03-10")?.phase).toBe("elevated");
    expect(currentPhase(all, "2026-04-05")?.phase).toBe("depressed");
  });
  it("returns null when nothing covers today", () => {
    const all = [marker({ id: "a", startDate: "2026-03-01", endDate: "2026-03-20", phase: "elevated" })];
    expect(currentPhase(all, "2026-05-01")).toBeNull();
  });
  it("prefers the most recently created when ranges overlap", () => {
    const all = [
      marker({ id: "a", startDate: "2026-03-01", endDate: "2026-03-31", phase: "elevated", createdAt: "2026-03-01T10:00:00" }),
      marker({ id: "b", startDate: "2026-03-10", endDate: "2026-03-25", phase: "mixed", createdAt: "2026-03-12T10:00:00" }),
    ];
    expect(currentPhase(all, "2026-03-15")?.phase).toBe("mixed");
  });
});

describe("episodeMarkerSummary", () => {
  it("describes the active phase without diagnosing", () => {
    const all = [marker({ id: "a", startDate: "2026-03-01", endDate: "2026-03-31", phase: "elevated" })];
    const s = episodeMarkerSummary(all, "2026-03-15");
    expect(s).toMatch(/elevated/i);
    expect(s.toLowerCase()).not.toMatch(/diagnos|disorder|clinical/i);
  });
  it("returns '' with no markers", () => {
    expect(episodeMarkerSummary([], "2026-03-15")).toBe("");
  });
});

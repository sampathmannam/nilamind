import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
  },
}));
vi.mock("./storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  }),
}));

import { setDndUntil, clearDnd, isDndActive, getDndUntil, enableDndFor, DND_DURATIONS } from "./dnd";

beforeEach(() => { store = {}; });

describe("dnd", () => {
  it("is inactive by default", () => {
    expect(isDndActive()).toBe(false);
    expect(getDndUntil()).toBeNull();
  });

  it("is active when set in the future", () => {
    const until = Date.now() + 60_000;
    setDndUntil(until);
    expect(getDndUntil()).toBe(until);
    expect(isDndActive()).toBe(true);
  });

  it("is inactive once the window has passed", () => {
    setDndUntil(Date.now() - 1);
    expect(isDndActive()).toBe(false);
  });

  it("can be cleared explicitly", () => {
    enableDndFor(24);
    expect(isDndActive()).toBe(true);
    clearDnd();
    expect(isDndActive()).toBe(false);
    expect(getDndUntil()).toBeNull();
  });

  it("enableDndFor(hours) opens a window roughly that long", () => {
    const start = Date.now();
    enableDndFor(3);
    const until = getDndUntil()!;
    expect(until).toBeGreaterThan(start + 3 * 60 * 60 * 1000 - 2000);
    expect(until).toBeLessThanOrEqual(start + 3 * 60 * 60 * 1000 + 2000);
    expect(isDndActive()).toBe(true);
  });

  it("DND_DURATIONS offers sensible presets", () => {
    expect(DND_DURATIONS.map((d) => d.hours)).toContain(24);
    expect(DND_DURATIONS.length).toBeGreaterThanOrEqual(3);
  });

  it("ignores a corrupt stored value gracefully", () => {
    store["nilamind_dnd_until"] = "not-a-number";
    expect(isDndActive()).toBe(false);
  });
});

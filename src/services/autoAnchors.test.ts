import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  SENSITIVE_KEYS: [],
}));

vi.mock("./retentionMetrics", () => ({
  dayKey: (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  },
}));

import {
  recordFirstOpenToday,
  getAutoWakeTime,
  recordLastCloseToday,
  getAutoBedTime,
  getAutoAnchors,
} from "./autoAnchors";

describe("autoAnchors", () => {
  beforeEach(() => store.clear());

  it("getAutoWakeTime returns null initially", () => {
    expect(getAutoWakeTime()).toBeNull();
  });

  it("getAutoBedTime returns null initially", () => {
    expect(getAutoBedTime()).toBeNull();
  });

  it("recordFirstOpenToday / getAutoWakeTime round-trip", () => {
    recordFirstOpenToday();
    const wake = getAutoWakeTime();
    expect(wake).not.toBeNull();
    expect(wake).toMatch(/^\d{2}:\d{2}$/);
  });

  it("recordLastCloseToday / getAutoBedTime round-trip", () => {
    recordLastCloseToday();
    const bed = getAutoBedTime();
    expect(bed).not.toBeNull();
    expect(bed).toMatch(/^\d{2}:\d{2}$/);
  });

  it("getAutoAnchors returns both wake and bed after recording", () => {
    recordFirstOpenToday();
    recordLastCloseToday();
    const anchors = getAutoAnchors();
    expect(anchors.wake).toMatch(/^\d{2}:\d{2}$/);
    expect(anchors.bed).toMatch(/^\d{2}:\d{2}$/);
  });

  it("getAutoAnchors returns empty object when nothing recorded", () => {
    expect(getAutoAnchors()).toEqual({});
  });

  it("recordFirstOpenToday is idempotent (no duplicate)", () => {
    recordFirstOpenToday();
    const first = getAutoWakeTime();
    recordFirstOpenToday();
    const second = getAutoWakeTime();
    expect(first).toBe(second);
  });

  it("recordLastCloseToday is idempotent per day", () => {
    recordLastCloseToday();
    const first = getAutoBedTime();
    recordLastCloseToday();
    const second = getAutoBedTime();
    expect(first).toBe(second);
  });
});

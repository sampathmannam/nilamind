import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

  it("recordLastCloseToday is stable within the same minute", () => {
    // Two backgrounds in the same minute produce the same HH:MM. (This case is unchanged by the
    // last-close fix below — it never distinguished "first wins" from "latest wins".)
    recordLastCloseToday();
    const first = getAutoBedTime();
    recordLastCloseToday();
    const second = getAutoBedTime();
    expect(first).toBe(second);
  });
});

// Bed time is a "last background of the day" proxy feeding the social-rhythm anchors. The writer
// returned early when a value already existed for today, so the FIRST background won and was never
// replaced — background the app at 09:00 and your bed time read 09:00 for the rest of the day.
// (Pipeline audit, 2026-08-24. The file's own comment said "we WANT the LATEST close, so always
// update"; the guard above it prevented exactly that.)
describe("autoAnchors — bed time tracks the LAST background of the day", () => {
  beforeEach(() => { store.clear(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it("a later background overwrites an earlier one", () => {
    vi.setSystemTime(new Date("2026-08-24T09:00:00"));
    recordLastCloseToday();
    expect(getAutoBedTime()).toBe("09:00");

    vi.setSystemTime(new Date("2026-08-24T23:40:00"));
    recordLastCloseToday();
    expect(getAutoBedTime(), "late background must replace the morning one").toBe("23:40");
  });

  it("many backgrounds through the day leave the latest", () => {
    for (const t of ["07:15", "12:30", "18:05", "22:50"]) {
      vi.setSystemTime(new Date(`2026-08-24T${t}:00`));
      recordLastCloseToday();
    }
    expect(getAutoBedTime()).toBe("22:50");
  });

  it("wake time still keeps the FIRST open, not the latest", () => {
    vi.setSystemTime(new Date("2026-08-24T06:45:00"));
    recordFirstOpenToday();
    vi.setSystemTime(new Date("2026-08-24T14:00:00"));
    recordFirstOpenToday();
    expect(getAutoWakeTime(), "wake proxy is the first open").toBe("06:45");
  });

  it("yesterday's anchors are not reported as today's", () => {
    vi.setSystemTime(new Date("2026-08-23T22:00:00"));
    recordFirstOpenToday();
    recordLastCloseToday();

    vi.setSystemTime(new Date("2026-08-24T10:00:00"));
    expect(getAutoWakeTime()).toBeNull();
    expect(getAutoBedTime()).toBeNull();
  });
});

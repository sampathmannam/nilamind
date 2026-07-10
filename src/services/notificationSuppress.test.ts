import { describe, it, expect, beforeEach, vi } from "vitest";
import { markSafetySuppression, isSafetySuppressed } from "./notificationSuppress";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

beforeEach(() => store.clear());

const DAY = 24 * 60 * 60 * 1000;

describe("notificationSuppress — 24h safety latch (P6.4)", () => {
  it("is not suppressed when nothing was marked", () => {
    expect(isSafetySuppressed(1000)).toBe(false);
  });

  it("suppresses for exactly 24h from the mark, then releases", () => {
    markSafetySuppression(1000);
    expect(isSafetySuppressed(1000)).toBe(true);
    expect(isSafetySuppressed(1000 + DAY - 1)).toBe(true);
    expect(isSafetySuppressed(1000 + DAY)).toBe(false); // window is [mark, mark+24h)
    expect(isSafetySuppressed(1000 + DAY + 5000)).toBe(false);
  });

  it("a fresh mark extends the window from the new time", () => {
    markSafetySuppression(1000);
    markSafetySuppression(1000 + DAY); // e.g. a second crisis open the next day
    expect(isSafetySuppressed(1000 + DAY + 1000)).toBe(true);
  });

  it("treats corrupt stored values as not-suppressed (fail-open only for the nudge, never for §9)", () => {
    store.set("nilamind_notif_suppress_until", "not-a-number");
    expect(isSafetySuppressed(1000)).toBe(false);
  });
});

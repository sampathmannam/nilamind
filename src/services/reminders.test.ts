import { vi, describe, it, expect, beforeEach } from "vitest";

const ls = new Map<string, string>();
vi.mock("./storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
    setItem: (k: string, v: string) => { ls.set(k, String(v)); },
    removeItem: (k: string) => { ls.delete(k); },
  }),
}));

import { getReminderPrefs, setReminderPrefs, withinQuietHours } from "./reminders";

beforeEach(() => ls.clear());

describe("reminders", () => {
  describe("getReminderPrefs", () => {
    it("returns defaults when nothing is stored", () => {
      const prefs = getReminderPrefs();
      expect(prefs).toEqual({
        enabled: true,
        windowStart: "10:00",
        windowEnd: "20:00",
        quietStart: "22:00",
        quietEnd: "08:00",
        weeklyDigest: true,
      });
    });

    it("returns defaults when stored data is corrupted", () => {
      ls.set("nilamind_reminders", "{invalid json");
      expect(getReminderPrefs()).toEqual({
        enabled: true,
        windowStart: "10:00",
        windowEnd: "20:00",
        quietStart: "22:00",
        quietEnd: "08:00",
        weeklyDigest: true,
      });
    });
  });

  describe("setReminderPrefs", () => {
    it("merges partial updates into stored prefs", () => {
      setReminderPrefs({ enabled: false });
      const prefs = getReminderPrefs();
      expect(prefs.enabled).toBe(false);
      expect(prefs.windowStart).toBe("10:00");
      expect(prefs.quietStart).toBe("22:00");
    });

    it("preserves existing fields across multiple partial sets", () => {
      setReminderPrefs({ windowStart: "09:00" });
      setReminderPrefs({ quietEnd: "07:00" });
      const prefs = getReminderPrefs();
      expect(prefs.windowStart).toBe("09:00");
      expect(prefs.quietEnd).toBe("07:00");
      expect(prefs.enabled).toBe(true);
    });

    it("round-trips full prefs", () => {
      setReminderPrefs({
        enabled: false,
        windowStart: "08:00",
        windowEnd: "18:00",
        quietStart: "21:00",
        quietEnd: "06:00",
        weeklyDigest: false,
      });
      expect(getReminderPrefs()).toEqual({
        enabled: false,
        windowStart: "08:00",
        windowEnd: "18:00",
        quietStart: "21:00",
        quietEnd: "06:00",
        weeklyDigest: false,
      });
    });
  });

  describe("withinQuietHours", () => {
    it("returns true when time is inside quiet hours (same-day range)", () => {
      setReminderPrefs({ quietStart: "22:00", quietEnd: "08:00" });
      const at = new Date(2026, 0, 1, 23, 30); // 23:30
      expect(withinQuietHours(at)).toBe(true);
    });

    it("returns false when time is outside quiet hours", () => {
      setReminderPrefs({ quietStart: "22:00", quietEnd: "08:00" });
      const at = new Date(2026, 0, 1, 14, 0); // 14:00
      expect(withinQuietHours(at)).toBe(false);
    });

    it("handles overnight wrapping — early morning is inside 22:00–08:00", () => {
      setReminderPrefs({ quietStart: "22:00", quietEnd: "08:00" });
      const at = new Date(2026, 0, 2, 3, 0); // 03:00
      expect(withinQuietHours(at)).toBe(true);
    });

    it("handles overnight wrapping — exactly at quietEnd boundary is outside", () => {
      setReminderPrefs({ quietStart: "22:00", quietEnd: "08:00" });
      const at = new Date(2026, 0, 2, 8, 0); // 08:00
      expect(withinQuietHours(at)).toBe(false);
    });

    it("handles same-day quiet hours (start < end, no overnight)", () => {
      setReminderPrefs({ quietStart: "12:00", quietEnd: "14:00" });
      expect(withinQuietHours(new Date(2026, 0, 1, 13, 0))).toBe(true);
      expect(withinQuietHours(new Date(2026, 0, 1, 11, 0))).toBe(false);
      expect(withinQuietHours(new Date(2026, 0, 1, 15, 0))).toBe(false);
    });

    it("returns false when at quietStart boundary (start inclusive, end exclusive)", () => {
      setReminderPrefs({ quietStart: "22:00", quietEnd: "08:00" });
      const at = new Date(2026, 0, 1, 22, 0); // exactly 22:00
      expect(withinQuietHours(at)).toBe(true);
    });
  });
});

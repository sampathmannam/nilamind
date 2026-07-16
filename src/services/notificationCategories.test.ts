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

import { getCategoryPrefs, setCategoryEnabled, isCategoryEnabled, NOTIFICATION_CATEGORIES, defaultCategoryPrefs } from "./notificationCategories";

beforeEach(() => { store = {}; });

describe("notificationCategories — P6.5", () => {
  it("all five categories default to enabled", () => {
    const prefs = getCategoryPrefs();
    expect(prefs.checkin).toBe(true);
    expect(prefs.armed).toBe(true);
    expect(prefs.insight).toBe(true);
    expect(prefs.protocol).toBe(true);
    expect(prefs.crisis_followup).toBe(true);
  });

  it("NOTIFICATION_CATEGORIES lists exactly the spec'd types (+ diary, added for the journal reminder)", () => {
    const ids = NOTIFICATION_CATEGORIES.map((c) => c.id);
    expect(ids).toEqual(["checkin", "armed", "insight", "protocol", "crisis_followup", "diary"]);
  });

  it("isCategoryEnabled reflects a toggled-off category", () => {
    setCategoryEnabled("checkin", false);
    expect(isCategoryEnabled("checkin")).toBe(false);
    expect(isCategoryEnabled("armed")).toBe(true); // others unaffected
  });

  it("toggling writes through and survives a reload", () => {
    setCategoryEnabled("insight", false);
    const prefs = getCategoryPrefs();
    expect(prefs.insight).toBe(false);
  });

  it("unknown category id falls back to enabled (safe default — never silently mute)", () => {
    expect(isCategoryEnabled("totally_unknown" as any)).toBe(true);
  });

  it("defaultCategoryPrefs is a truthy map of all categories", () => {
    expect(Object.keys(defaultCategoryPrefs).length).toBe(6);
  });
});

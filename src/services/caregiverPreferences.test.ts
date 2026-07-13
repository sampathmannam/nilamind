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
  getCaregiverPreferences,
  setCaregiverPreferences,
  DEFAULT_PREFERENCES,
  type CaregiverPreferences,
} from "./caregiverPreferences";

beforeEach(() => store.clear());

describe("caregiverPreferences — defaults", () => {
  it("returns default preferences for an unknown contact", () => {
    const p = getCaregiverPreferences("cg_unknown");
    expect(p).toEqual(DEFAULT_PREFERENCES);
    expect(p.shareCategories.mood).toBe(false);
    expect(p.shareCategories.phase).toBe(true);
  });

  it("DEFAULT_PREFERENCES is a frozen, shareable reference", () => {
    expect(Object.isFrozen(DEFAULT_PREFERENCES)).toBe(true);
  });
});

describe("setCaregiverPreferences / getCaregiverPreferences", () => {
  it("round-trips preferences for a contact", () => {
    const prefs: CaregiverPreferences = {
      shareCategories: { mood: true, phase: false, sleep: true, medication: false, wellbeing: true, checkins: false },
      autoAlert: { enabled: true, thresholdDays: 3, minIntensity: 7 },
      lastSharedAt: "2026-07-13T12:00:00",
    };
    setCaregiverPreferences("cg_a", prefs);
    const got = getCaregiverPreferences("cg_a");
    expect(got.shareCategories.mood).toBe(true);
    expect(got.shareCategories.phase).toBe(false);
    expect(got.autoAlert.enabled).toBe(true);
    expect(got.autoAlert.thresholdDays).toBe(3);
  });

  it("does not leak preferences across contacts", () => {
    setCaregiverPreferences("cg_a", {
      ...DEFAULT_PREFERENCES,
      shareCategories: { ...DEFAULT_PREFERENCES.shareCategories, mood: true },
    });
    const pb = getCaregiverPreferences("cg_b");
    expect(pb.shareCategories.mood).toBe(false);
  });

  it("rejects invalid share-category keys", () => {
    expect(() =>
      setCaregiverPreferences("cg_x", {
        shareCategories: { mood: true, phase: false, sleep: true } as any,
        autoAlert: { enabled: false, thresholdDays: 3, minIntensity: 5 },
      }),
    ).toThrow("shareCategories");
  });

  it("rejects autoAlert thresholdDays below 1", () => {
    expect(() =>
      setCaregiverPreferences("cg_x", {
        ...DEFAULT_PREFERENCES,
        autoAlert: { enabled: true, thresholdDays: 0, minIntensity: 5 },
      }),
    ).toThrow("thresholdDays must be >= 1");
  });
});

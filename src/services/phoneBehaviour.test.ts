import { describe, it, expect, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "web", isNativePlatform: () => false },
}));
vi.mock("@capgo/capacitor-android-usagestatsmanager", () => ({
  CapacitorUsageStatsManager: {
    isUsageStatsPermissionGranted: vi.fn(async () => ({ granted: false })),
    openUsageStatsSettings: vi.fn(async () => {}),
    queryAndAggregateUsageStats: vi.fn(async () => ({})),
  },
}));

import { todayKey, isPhoneDataAvailable } from "./phoneBehaviour";

describe("todayKey", () => {
  it("returns YYYY-MM-DD format", () => {
    const key = todayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("uses local date, not UTC", () => {
    const d = new Date(2025, 0, 15); // Jan 15, 2025 local
    expect(todayKey(d)).toBe("2025-01-15");
  });

  it("pads single-digit months and days", () => {
    const d = new Date(2025, 1, 3); // Feb 3
    expect(todayKey(d)).toBe("2025-02-03");
  });
});

describe("isPhoneDataAvailable", () => {
  it("returns a boolean", () => {
    const result = isPhoneDataAvailable();
    expect(typeof result).toBe("boolean");
  });

  it("returns false on web", () => {
    expect(isPhoneDataAvailable()).toBe(false);
  });
});

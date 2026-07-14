import { vi, describe, it, expect, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
}));

import {
  getAllAchievements,
  getUnlockedAchievements,
  getAchievementCount,
  tryUnlockAchievement,
  isAchievementUnlocked,
  checkAchievementConditions,
  resetAchievements,
  ACHIEVEMENT_REGISTRY,
} from "./achievements";

beforeEach(() => store.clear());

describe("achievements — registry", () => {
  it("has at least 10 achievements defined", () => {
    expect(ACHIEVEMENT_REGISTRY.length).toBeGreaterThanOrEqual(10);
  });

  it("all achievements have unique ids", () => {
    const ids = ACHIEVEMENT_REGISTRY.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all achievements have title, description, icon, color, category", () => {
    for (const a of ACHIEVEMENT_REGISTRY) {
      expect(a.title).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.icon).toBeTruthy();
      expect(a.color).toBeTruthy();
      expect(a.category).toBeTruthy();
    }
  });
});

describe("getAllAchievements", () => {
  it("returns all achievements with null unlockedAt initially", () => {
    const all = getAllAchievements();
    expect(all.length).toBe(ACHIEVEMENT_REGISTRY.length);
    expect(all.every((a) => a.unlockedAt === null)).toBe(true);
  });
});

describe("tryUnlockAchievement", () => {
  it("returns true on first unlock", () => {
    expect(tryUnlockAchievement("first_checkin")).toBe(true);
  });

  it("returns false on duplicate unlock", () => {
    tryUnlockAchievement("first_checkin");
    expect(tryUnlockAchievement("first_checkin")).toBe(false);
  });

  it("persists the unlock", () => {
    tryUnlockAchievement("first_checkin");
    expect(isAchievementUnlocked("first_checkin")).toBe(true);
  });
});

describe("getUnlockedAchievements", () => {
  it("returns empty when none unlocked", () => {
    expect(getUnlockedAchievements()).toEqual([]);
  });

  it("returns unlocked achievements sorted by date (newest first)", () => {
    tryUnlockAchievement("first_checkin");
    tryUnlockAchievement("seven_day_streak");
    const unlocked = getUnlockedAchievements();
    expect(unlocked.length).toBe(2);
    expect(unlocked.map((a) => a.id)).toContain("first_checkin");
    expect(unlocked.map((a) => a.id)).toContain("seven_day_streak");
  });
});

describe("getAchievementCount", () => {
  it("returns 0 initially", () => {
    expect(getAchievementCount()).toBe(0);
  });

  it("increments on unlock", () => {
    tryUnlockAchievement("first_checkin");
    expect(getAchievementCount()).toBe(1);
  });
});

describe("checkAchievementConditions", () => {
  it("unlocks first_checkin when checkinCount >= 1", () => {
    const result = checkAchievementConditions({
      checkinCount: 1, streakDays: 0, hasEpisodeMarkers: false,
      hasSafetyPlan: false, hasCaregiverContact: false, hasWellbeingCheck: false, hasUsedTool: false,
    });
    expect(result).toContain("first_checkin");
    expect(isAchievementUnlocked("first_checkin")).toBe(true);
  });

  it("unlocks seven_day_streak when streakDays >= 7", () => {
    const result = checkAchievementConditions({
      checkinCount: 0, streakDays: 7, hasEpisodeMarkers: false,
      hasSafetyPlan: false, hasCaregiverContact: false, hasWellbeingCheck: false, hasUsedTool: false,
    });
    expect(result).toContain("seven_day_streak");
  });

  it("unlocks multiple achievements at once", () => {
    const result = checkAchievementConditions({
      checkinCount: 10, streakDays: 7, hasEpisodeMarkers: true,
      hasSafetyPlan: false, hasCaregiverContact: false, hasWellbeingCheck: false, hasUsedTool: false,
    });
    expect(result).toContain("first_checkin");
    expect(result).toContain("ten_checkins");
    expect(result).toContain("seven_day_streak");
    expect(result).toContain("first_episode");
  });

  it("does not re-unlock already unlocked achievements", () => {
    tryUnlockAchievement("first_checkin");
    const result = checkAchievementConditions({
      checkinCount: 1, streakDays: 0, hasEpisodeMarkers: false,
      hasSafetyPlan: false, hasCaregiverContact: false, hasWellbeingCheck: false, hasUsedTool: false,
    });
    expect(result).not.toContain("first_checkin");
  });
});

describe("resetAchievements", () => {
  it("clears all unlocked achievements", () => {
    tryUnlockAchievement("first_checkin");
    tryUnlockAchievement("seven_day_streak");
    resetAchievements();
    expect(getAchievementCount()).toBe(0);
  });
});

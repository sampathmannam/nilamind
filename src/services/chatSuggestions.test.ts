import { describe, it, expect, vi, beforeEach } from "vitest";

// The onboarding goal picker (`nilamind_user_goal`) was write-only (audit finding, engagement-onboarding
// synthesis) — getUserGoals() is the first reader, and getSuggestions() uses it to personalize which chip
// leads. Mock secureLocal (Map-backed) the same way retentionMetrics.test.ts does, so tests can control the
// stored goal selection without touching real storage.
const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import { timeSlot, getSuggestions, getUserGoals } from "./chatSuggestions";

beforeEach(() => {
  store.clear();
});

describe("chatSuggestions", () => {
  it("timeSlot returns correct slot for each hour", () => {
    expect(timeSlot(3)).toBe("night");
    expect(timeSlot(7)).toBe("night");
    expect(timeSlot(8)).toBe("morning");
    expect(timeSlot(11)).toBe("morning");
    expect(timeSlot(12)).toBe("day");
    expect(timeSlot(16)).toBe("day");
    expect(timeSlot(17)).toBe("evening");
    expect(timeSlot(20)).toBe("evening");
    expect(timeSlot(21)).toBe("night");
    expect(timeSlot(23)).toBe("night");
  });

  it("getSuggestions returns 3 chips for a given slot", () => {
    const chips = getSuggestions("morning");
    expect(chips).toHaveLength(3);
    expect(chips[0].id).toMatch(/^am_/);
    expect(chips.every((c) => c.text && c.Icon)).toBe(true);
  });

  it("adapts first chip when recent mood is intense", () => {
    const chips = getSuggestions("day", { intensity: 9, emotion: "Anxious" });
    expect(chips[0].id).toBe("elevated");
  });

  it("adapts first chip when recent mood is very low", () => {
    const chips = getSuggestions("day", { intensity: 2, emotion: "Low" });
    expect(chips[0].id).toBe("low");
  });

  it("does not modify chips when mood is moderate", () => {
    const chips = getSuggestions("day", { intensity: 5, emotion: "Okay" });
    expect(chips[0].id).not.toBe("elevated");
    expect(chips[0].id).not.toBe("low");
  });
});

// The onboarding goal picker was write-only (audit finding). getUserGoals() reads it back; getSuggestions()
// personalizes chip ordering to what the user told us they came here for — a named engagement facilitator,
// per Borghouts, Eikey, Mark et al. (2021), J Med Internet Res.
describe("getUserGoals (previously write-only nilamind_user_goal)", () => {
  it("returns an empty array when nothing was ever chosen", () => {
    expect(getUserGoals()).toEqual([]);
  });

  it("reads back the goals persisted at the onboarding key", () => {
    store.set("nilamind_user_goal", JSON.stringify(["Managing anxiety", "Tracking moods"]));
    expect(getUserGoals()).toEqual(["Managing anxiety", "Tracking moods"]);
  });

  it("is tolerant of corrupt storage", () => {
    store.set("nilamind_user_goal", "{not json");
    expect(getUserGoals()).toEqual([]);
  });
});

describe("getSuggestions goal-aware ordering", () => {
  it("promotes the anxiety-relevant chip to the front when the goal is Managing anxiety", () => {
    store.set("nilamind_user_goal", JSON.stringify(["Managing anxiety"]));
    const chips = getSuggestions("day");
    expect(chips[0].id).toBe("day_anxiety");
  });

  it("promotes the mood-tracking chip to the front when the goal is Tracking moods", () => {
    store.set("nilamind_user_goal", JSON.stringify(["Tracking moods"]));
    const chips = getSuggestions("morning");
    expect(chips[0].id).toBe("am_checkin");
  });

  it("leaves ordering unchanged when goals is an explicit empty array", () => {
    const chips = getSuggestions("morning", null, []);
    expect(chips[0].id).toBe("am_checkin");
  });

  it("real-time intense mood still wins the lead slot over a static goal", () => {
    store.set("nilamind_user_goal", JSON.stringify(["Tracking moods"]));
    const chips = getSuggestions("day", { intensity: 9, emotion: "Anxious" });
    expect(chips[0].id).toBe("elevated");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", async () => {
  const actual = await vi.importActual<typeof import("./secureLocal")>("./secureLocal");
  return {
    ...actual,
    secureLocal: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  };
});

// "Mostly calm" mood signal — reuse modeEngine's existing getUserState() rather than inventing a second
// mood-detection path (2026-07-12 Wave 3, Task 1.5).
const modeMocks = vi.hoisted(() => ({ userState: "calm" as string | null }));
vi.mock("./modeEngine", () => ({ getUserState: () => modeMocks.userState }));

// "No recent crisis" — reuse the SAME 24h crisis/elevation latch P6.4 already uses to gate every other
// "how are you?" nudge (notificationSuppress.ts), rather than inventing a second crisis-adjacency check.
const suppressMocks = vi.hoisted(() => ({ suppressed: false }));
vi.mock("./notificationSuppress", () => ({ isSafetySuppressed: () => suppressMocks.suppressed }));

import { calmSafetyPlanNudge, dismissCalmSafetyPlanNudge, hasDiaryEntryToday } from "./proactiveEngine";

const BLANK_PLAN = JSON.stringify({
  warningSigns: "", internalCoping: "", socialDistractors: "", trustedPeople: "", professionals: "", safeEnvironment: "",
});
const FULL_PLAN = JSON.stringify({
  warningSigns: "a", internalCoping: "b", socialDistractors: "c", trustedPeople: "d", professionals: "e", safeEnvironment: "f",
});

beforeEach(() => {
  store.clear();
  modeMocks.userState = "calm";
  suppressMocks.suppressed = false;
});

// Regression: the evening diary reminder read secureLocal key "nilamind_diary_" + today, which is
// never written anywhere — DiaryCardScreen stores all entries as one JSON object under the single
// key "nilamind_diary", keyed internally by date. The reminder therefore always saw `null` and
// fired every evening regardless of whether a diary entry actually existed for today.
describe("hasDiaryEntryToday", () => {
  const today = new Date().toISOString().split("T")[0];

  it("returns false when nothing has been saved", () => {
    expect(hasDiaryEntryToday()).toBe(false);
  });

  it("returns false when the diary blob has entries for OTHER dates only", () => {
    store.set("nilamind_diary", JSON.stringify({ "2020-01-01": { date: "2020-01-01" } }));
    expect(hasDiaryEntryToday()).toBe(false);
  });

  it("returns true once today's entry has actually been saved (real storage key)", () => {
    store.set("nilamind_diary", JSON.stringify({ [today]: { date: today, emotions: {}, skillsUsed: [] } }));
    expect(hasDiaryEntryToday()).toBe(true);
  });
});

describe("calmSafetyPlanNudge — calm-moment-only, never crisis-moment (2026-07-12 Wave 3, Task 1.5)", () => {
  it("fires when mood is calm, no recent crisis, and a safety-plan section is blank", () => {
    store.set("nilamind_safetyplan", BLANK_PLAN);
    const nudge = calmSafetyPlanNudge();
    expect(nudge?.show).toBe(true);
  });

  it("never fires when the mood signal is NOT calm", () => {
    modeMocks.userState = "anxious";
    store.set("nilamind_safetyplan", BLANK_PLAN);
    expect(calmSafetyPlanNudge()).toBeNull();
  });

  it("never fires within the 24h post-crisis suppression window (reuses the P6.4 latch)", () => {
    suppressMocks.suppressed = true;
    store.set("nilamind_safetyplan", BLANK_PLAN);
    expect(calmSafetyPlanNudge()).toBeNull();
  });

  it("never fires once every safety-plan section is filled in", () => {
    store.set("nilamind_safetyplan", FULL_PLAN);
    expect(calmSafetyPlanNudge()).toBeNull();
  });

  it("never fires with no safety plan saved at all (treated as fully blank → still gated by mood/crisis checks, but fires since it IS blank)", () => {
    // No plan saved → parseSafetyPlan defaults to all-blank fields, which is a real "blank section" case.
    expect(calmSafetyPlanNudge()?.show).toBe(true);
  });

  it("respects a 7-day cooldown after being dismissed (matches weekly_summary's existing precedent)", () => {
    store.set("nilamind_safetyplan", BLANK_PLAN);
    expect(calmSafetyPlanNudge()?.show).toBe(true);
    dismissCalmSafetyPlanNudge();
    expect(calmSafetyPlanNudge()).toBeNull();
  });
});

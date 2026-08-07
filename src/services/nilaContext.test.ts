import { describe, it, expect, beforeEach, vi } from "vitest";
import { trajectoryContextBlock, inflectionContextBlock, antiSycophancyContextBlock, wellbeingContextBlock, episodeMarkerContextBlock, caregiverContextBlock, onboardingContextBlock } from "./nilaContext";
import type { SleepSignal } from "./healthConnect";
import type { InflectionSignal } from "./nilaInflection";
import type { AssessmentEntry } from "./assessments";
import type { EpisodeMarker } from "./episodeMarker";
const emStore = new Map<string, string>();
vi.mock("./secureLocal", async () => {
  const actual = await vi.importActual<typeof import("./secureLocal")>("./secureLocal");
  return {
    ...actual,
    secureLocal: {
      getItem: (k: string) => (emStore.has(k) ? emStore.get(k)! : null),
      setItem: (k: string, v: string) => void emStore.set(k, v),
      removeItem: (k: string) => void emStore.delete(k),
    },
    appendToSecureArray: <T>(key: string, item: T) => {
      const arr: T[] = emStore.has(key) ? JSON.parse(emStore.get(key)!) : [];
      arr.push(item);
      emStore.set(key, JSON.stringify(arr));
      return arr;
    },
  };
});

// Audit finding (2026-07-06): the short-sleep manic-prodrome signal — the earliest warning a MANIC-FIRST app
// has — reached the user on ZERO surfaces, and the chat never saw it. This block feeds that signal into
// buildPersonalContext so Nila can gently reference it (sense→ask→confirm; never an alarm).
describe("trajectoryContextBlock — surfaces the short-sleep manic-prodrome signal to Nila", () => {
  it("returns '' when there is no signal or it isn't firing", () => {
    expect(trajectoryContextBlock(null)).toBe("");
    const notFiring: SleepSignal = { firing: false, nightsBelow: 0, baselineHours: 7.5, detail: "", baselineNights: 30, provisional: false };
    expect(trajectoryContextBlock(notFiring)).toBe("");
  });

  it("surfaces a firing short-sleep run as a gentle, manic-first heads-up (not an alarm)", () => {
    const firing: SleepSignal = { firing: true, nightsBelow: 3, baselineHours: 7.5, detail: "3 nights below ~7.5h", baselineNights: 30, provisional: false };
    const block = trajectoryContextBlock(firing);
    expect(block).toContain("3");                              // the count of short nights
    expect(block.toLowerCase()).toContain("sleep");
    expect(block.toLowerCase()).toContain("rest");             // prompt-to-ask about rest
    expect(block.toLowerCase()).toMatch(/wired|elevated|racing|speeding|too fast/); // manic-first link
  });
});

// Audit finding (2026-07-06): a detected trajectory SHIFT (nilaInflection) surfaced only as a UI opener bubble
// and never reached the model, so the reply that followed had no idea a deterioration was flagged. This block
// makes the shift part of Nila's awareness (held gently; gated on the user's inflection preference at the call
// site so it respects their explicit opt-in).
describe("inflectionContextBlock — feeds a detected trajectory shift into Nila's awareness", () => {
  const sig = (direction: "deterioration" | "improvement", detail: string): InflectionSignal => ({
    id: "x", kind: "mood_trend", direction, metric: "mood", detail, opener: "", basis: "", date: "2026-07-06", dataPoints: 8,
  });
  it("returns '' when there is no signal", () => {
    expect(inflectionContextBlock(null)).toBe("");
  });
  it("surfaces a deterioration shift gently (never lead-with-it / quote-as-fact)", () => {
    const b = inflectionContextBlock(sig("deterioration", "mood trending harder this week"));
    expect(b.toLowerCase()).toMatch(/shift|downward|trend|harder/);
    expect(b.toLowerCase()).toContain("gently");
  });
  it("surfaces an improvement shift warmly without making them perform being okay", () => {
    const b = inflectionContextBlock(sig("improvement", "mood easing over the past week"));
    expect(b.toLowerCase()).toMatch(/eas|lighter|better|improv|up/);
  });
});

describe("wellbeingContextBlock — longitudinal WHO-5 trend (Phase 17)", () => {
  const who5 = (date: string, total: number): AssessmentEntry => ({
    id: "w_" + date, date, timestamp: "10:00:00", instrument: "WHO-5", responses: [], total, severity: "Good wellbeing", safetyFlag: false,
  });
  it("returns '' when there is no WHO-5 history", () => {
    expect(wellbeingContextBlock([])).toBe("");
  });
  it("surfaces an improving trend as a gentle, wellness-framed pattern (never a diagnosis)", () => {
    const h = [who5("2026-01-01", 40), who5("2026-01-15", 70), who5("2026-02-01", 88)];
    const b = wellbeingContextBlock(h);
    expect(b).toContain("wellbeing");
    expect(b.toLowerCase()).toContain("improving");
    expect(b).not.toMatch(/diagnos|disorder|clinical/i);
  });
  it("notes when the fortnightly check is due", () => {
    const h = [who5("2026-01-01", 60), who5("2026-01-15", 65)];
    const b = wellbeingContextBlock(h); // today is well past 14 days
    expect(b.toLowerCase()).toContain("due");
  });
});

describe("antiSycophancyContextBlock — depressive distortions (2026-07-12)", () => {
  it("names harsh self-belief non-collusion, not just mania themes", () => {
    const block = antiSycophancyContextBlock();
    expect(block).toMatch(/failure|worthless/i);
    expect(block).toMatch(/everyone hates/i);
  });
});

describe("episodeMarkerContextBlock — user-owned phase tag (Phase 18)", () => {
  beforeEach(() => emStore.clear());
  const em = (over: Partial<EpisodeMarker> = {}): EpisodeMarker => ({
    id: "m1", startDate: "2020-01-01", endDate: "2099-12-31", phase: "mixed", note: "", createdAt: "2026-03-01T10:00:00", ...over,
  });
  it("returns '' when there are no markers", () => {
    expect(episodeMarkerContextBlock()).toBe("");
  });
  it("surfaces the active phase as a pattern, never a diagnosis", () => {
    emStore.set("nilamind_episode_markers", JSON.stringify([em({ phase: "mixed" })]));
    const b = episodeMarkerContextBlock();
    expect(b).toContain("mixed");
    expect(b.toLowerCase()).not.toMatch(/diagnos|disorder|clinical/i);
  });
});

describe("caregiverContextBlock — trusted-person sharing (Phase 19)", () => {
  beforeEach(() => emStore.clear());
  it("returns '' when no contacts exist", () => {
    expect(caregiverContextBlock()).toBe("");
  });
  it("notes one trusted person when a single contact is stored", () => {
    emStore.set("nilamind_caregiver_contacts", JSON.stringify([
      { id: "cg_1", name: "Priya", phoneOrEmail: "p@x.com", relationship: "Sister", addedAt: "2026-07-13T10:00:00" },
    ]));
    const b = caregiverContextBlock();
    expect(b).toContain("Priya");
    expect(b).toContain("one trusted person");
    expect(b.toLowerCase()).not.toMatch(/diagnos|disorder|clinical/i);
  });
  it("notes multiple trusted people when several contacts exist", () => {
    emStore.set("nilamind_caregiver_contacts", JSON.stringify([
      { id: "cg_1", name: "Priya", phoneOrEmail: "p@x.com", relationship: "Sister", addedAt: "2026-07-13T10:00:00" },
      { id: "cg_2", name: "Raj", phoneOrEmail: "r@x.com", relationship: "Brother", addedAt: "2026-07-13T10:00:00" },
    ]));
    const b = caregiverContextBlock();
    expect(b).toContain("2 trusted people");
    expect(b).toContain("Priya");
    expect(b).toContain("Raj");
  });
});

describe("onboardingContextBlock — UX-2 day-one personalization into Nila's context", () => {
  beforeEach(() => emStore.clear());
  it("returns '' when no onboarding data was captured", () => {
    expect(onboardingContextBlock()).toBe("");
  });
  it("reads chosen goals and surfaces them as gentle focus areas", () => {
    emStore.set("nilamind_user_goal", JSON.stringify(["sleep", "mood"]));
    const b = onboardingContextBlock();
    expect(b).toContain("sleep");
    expect(b).toContain("mood");
    expect(b).toContain("focus areas");
    expect(b.toLowerCase()).not.toMatch(/diagnos|disorder|clinical/i);
  });
  it("reads baseline mood and frames it as a starting point, not a label", () => {
    emStore.set("nilamind_onboarding_mood", "2");
    const b = onboardingContextBlock();
    expect(b).toContain("really struggling");
    expect(b).toContain("mood 2/10");
    expect(b).toContain("gentle starting point");
  });
  it("combines goals and mood in a single warm block", () => {
    emStore.set("nilamind_user_goal", JSON.stringify(["grounding"]));
    emStore.set("nilamind_onboarding_mood", "8");
    const b = onboardingContextBlock();
    expect(b).toContain("grounding");
    expect(b).toContain("feeling good");
  });
});

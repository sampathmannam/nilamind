import { describe, it, expect, beforeEach, vi } from "vitest";

// Clinical research upgrades wave 2 (2026-07-12), Task C — close the BA mood loop: capture moodBefore
// (previously dead/unused per the 2026-07-09 audit) and add moodAfter alongside mastery/pleasure, per
// Jacobson, Martell & Dimidjian (2001), Clin Psychol Sci Pract — activity+mood monitoring is core, evidence-
// defined BA, and the ingredient most commercial apps omit.

const store: Record<string, string> = {};
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
  SENSITIVE_KEYS: [] as string[],
}));

import { pickBAActivity, handleBAAction } from "./protocolBA";
import { startProtocol, abandonProtocol } from "./protocolProgress";
import { loadActivities } from "./behaviouralActivation";

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  abandonProtocol();
});

describe("protocolBA — mood-loop closure (Task C)", () => {
  it("pickBAActivity captures moodBefore when provided", () => {
    const entry = pickBAActivity("Walk outside", "movement", 4);
    expect(entry.moodBefore).toBe(4);
    const loaded = loadActivities();
    expect(loaded[0].moodBefore).toBe(4);
  });

  it("pickBAActivity omits moodBefore when not provided (never fabricate a rating)", () => {
    const entry = pickBAActivity("Walk outside", "movement");
    expect(entry.moodBefore).toBeUndefined();
  });

  it("handleBAAction pick_activity captures moodBefore alongside the planned activity", () => {
    startProtocol("behavioral-activation");
    handleBAAction({ type: "advance_step" }); // ba-1 -> ba-2
    handleBAAction({ type: "advance_step" }); // ba-2 -> ba-3 (plan)

    handleBAAction({
      type: "pick_activity",
      activity: { id: "x", title: "Text someone back", category: "connection", tiny: "Send a wave" },
      moodBefore: 3,
    });

    const loaded = loadActivities();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe("Text someone back");
    expect(loaded[0].moodBefore).toBe(3);
  });

  it("handleBAAction rate_activity captures moodAfter alongside mastery/pleasure", () => {
    startProtocol("behavioral-activation");
    handleBAAction({ type: "advance_step" }); // ba-1 -> ba-2
    handleBAAction({ type: "advance_step" }); // ba-2 -> ba-3 (plan)
    handleBAAction({
      type: "pick_activity",
      activity: { id: "x", title: "Make your bed", category: "mastery", tiny: "Pull the duvet straight" },
      moodBefore: 2,
    }); // -> ba-4 (exercise)
    handleBAAction({ type: "advance_step" }); // ba-4 -> ba-5 (reflect / rate)

    const activities = loadActivities();
    const activityId = activities[0].id;

    handleBAAction({ type: "rate_activity", activityId, mastery: 7, pleasure: 6, moodAfter: 6 });

    const after = loadActivities();
    expect(after[0].status).toBe("done");
    expect(after[0].mastery).toBe(7);
    expect(after[0].pleasure).toBe(6);
    expect(after[0].moodAfter).toBe(6);
    expect(after[0].moodBefore).toBe(2); // before-rating must survive the update, not be clobbered
  });

  it("rate_activity works without moodAfter (never require a field it doesn't have)", () => {
    startProtocol("behavioral-activation");
    handleBAAction({ type: "advance_step" });
    handleBAAction({ type: "advance_step" });
    handleBAAction({
      type: "pick_activity",
      activity: { id: "x", title: "Warm shower or bath", category: "pleasure", tiny: "Wash your face" },
    });
    handleBAAction({ type: "advance_step" });

    const activityId = loadActivities()[0].id;
    handleBAAction({ type: "rate_activity", activityId, mastery: 5, pleasure: 5 });

    const after = loadActivities();
    expect(after[0].moodAfter).toBeUndefined();
    expect(after[0].mastery).toBe(5);
  });
});

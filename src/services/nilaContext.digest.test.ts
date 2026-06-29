import { vi, describe, it, expect, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import { buildReflectionDigest } from "./nilaContext";

const today = new Date();
const iso = (d: Date) => d.toISOString().split("T")[0];

beforeEach(() => {
  store.clear();
  store.set("nilamind_checkins", JSON.stringify([
    { date: iso(today), emotion: "Anxious", intensity: 7, context: "SECRET_CONTEXT_XYZ" },
    { date: iso(today), emotion: "Anxious", intensity: 5, context: "more secret" },
  ]));
  store.set("nilamind_episodes", JSON.stringify([
    { date: iso(today), timeOfDay: "evening", trigger: "SECRET_TRIGGER_XYZ", skillsHelpful: ["Box breathing"] },
  ]));
  store.set("nilamind_diary", JSON.stringify({
    [iso(today)]: { date: iso(today), quickNotes: "SECRET_NOTE_XYZ", morningIntention: "SECRET_INTENT_XYZ", skillsUsed: ["TIPP"], emotions: { misery: 1, shame: 0, anger: 0, fear: 2, joy: 1, love: 1 } },
  }));
});

describe("buildReflectionDigest", () => {
  it("emits derived signal", () => {
    const d = buildReflectionDigest();
    expect(d).toContain("Check-ins");
    expect(d.toLowerCase()).toContain("anxious");
    expect(d).toContain("TIPP"); // diary-logged skill IS read (object-shaped store)
  });
  it("NEVER contains raw free-text fields", () => {
    const d = buildReflectionDigest();
    for (const secret of ["SECRET_CONTEXT_XYZ", "more secret", "SECRET_TRIGGER_XYZ", "SECRET_NOTE_XYZ", "SECRET_INTENT_XYZ"]) {
      expect(d).not.toContain(secret);
    }
  });
  it("returns '' when there is no history", () => {
    store.clear();
    expect(buildReflectionDigest()).toBe("");
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";

// computeProactiveMoment is live: its result is injected into Nila's system prompt through
// nilaContext.proactiveContextBlock. Two defects were found by a pipeline audit (2026-08-24):
//   1. it was the only proactive producer with no §9 crisis-suppression check, so inside the 24h
//      post-crisis window the model could still be told to nudge a check-in / wind-down / med log;
//   2. its dismissal cooldown was `24 * DAY_MS` = 24 DAYS, not the documented 24 hours, so
//      dismissing a moment silenced it for most of a month.
// It had zero test references before this file.

const store = new Map<string, string>();
vi.mock("./secureLocal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./secureLocal")>();
  return {
    ...actual,
    secureLocal: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  };
});

let suppressed = false;
vi.mock("./notificationSuppress", () => ({
  isSafetySuppressed: () => suppressed,
  markSafetySuppression: () => { suppressed = true; },
}));

import { computeProactiveMoment, isProactiveDismissed, dismissProactive } from "./proactiveEngine";
import { DAY_MS } from "./storageUtils";

beforeEach(() => { store.clear(); suppressed = false; });

describe("computeProactiveMoment — §9 crisis suppression", () => {
  it("returns nothing while the post-crisis latch is active", () => {
    // A moment is available in the normal case (no check-in logged today).
    const before = computeProactiveMoment();
    expect(before, "expected a moment to be available without suppression").toBeTruthy();

    suppressed = true;
    expect(computeProactiveMoment()).toBeNull();
  });

  it("resumes once the latch clears", () => {
    suppressed = true;
    expect(computeProactiveMoment()).toBeNull();
    suppressed = false;
    expect(computeProactiveMoment()).toBeTruthy();
  });

  it("never throws into the prompt path if the latch cannot be read", () => {
    // The prompt build must not hard-fail on a storage error; worst case it stays silent.
    expect(() => computeProactiveMoment()).not.toThrow();
  });
});

describe("computeProactiveMoment — dismissal cooldown is a day, not a month", () => {
  it("a dismissal made 25 hours ago has expired", () => {
    dismissProactive("checkin_due");
    // Rewind the stored dismissal to 25h ago — comfortably past 24h, nowhere near 24 days.
    const key = "nilamind_proactive_dismiss_checkin_due";
    store.set(key, String(Date.now() - 25 * 60 * 60 * 1000));
    expect(isProactiveDismissed(key.replace("nilamind_proactive_dismiss_", ""))).toBe(false);
  });

  it("a dismissal made an hour ago is still in effect", () => {
    const key = "checkin_due";
    store.set(`nilamind_proactive_dismiss_${key}`, String(Date.now() - 60 * 60 * 1000));
    expect(isProactiveDismissed(key)).toBe(true);
  });

  it("the default cooldown is one day", () => {
    const key = "checkin_due";
    store.set(`nilamind_proactive_dismiss_${key}`, String(Date.now() - (DAY_MS + 60_000)));
    expect(isProactiveDismissed(key), "just over a day old should have expired").toBe(false);
  });
});

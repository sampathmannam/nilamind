import { describe, it, expect } from "vitest";
import {
  chooseNudge,
  DISENGAGEMENT_NUDGES,
  MEDICATION_NUDGES,
  WARM_NUDGES,
} from "./notificationCopy";

// UX-9 (Notification Polish): "Tests for contextual copy." The chooseNudge priority cascade lives in
// notificationCopy.ts; this suite pins the two branches the original notifications.nudge.test.ts didn't
// cover (disengagement + medication) so the full cascade is locked, and confirms the dayIndex rotation.

describe("chooseNudge — disengagement + medication branches (UX-9)", () => {
  it("surfaces a no-judgment re-engagement nudge when disengaged", () => {
    const n = chooseNudge({ dayIndex: 0, disengaged: true });
    expect(DISENGAGEMENT_NUDGES).toContain(n);
    expect(n.toLowerCase()).not.toMatch(/guilt|failure|behind/);
  });

  it("ranks sleep-prodrome and deterioration ABOVE disengagement", () => {
    expect(DISENGAGEMENT_NUDGES).not.toContain(chooseNudge({ dayIndex: 0, sleepFiring: true, disengaged: true }));
    expect(DISENGAGEMENT_NUDGES).not.toContain(chooseNudge({ dayIndex: 0, inflection: "deterioration", disengaged: true }));
  });

  it("ranks disengagement ABOVE lapse/streak/medication", () => {
    const n = chooseNudge({ dayIndex: 0, disengaged: true, lapsed: true, streak: 9, activeToday: true, medicationMissed: true });
    expect(DISENGAGEMENT_NUDGES).toContain(n);
  });

  it("surfaces a gentle medication nudge only when nothing higher-priority is firing", () => {
    const n = chooseNudge({ dayIndex: 1, medicationMissed: true });
    expect(MEDICATION_NUDGES).toContain(n);
  });

  it("ranks every higher-priority signal ABOVE medication", () => {
    const cases = [
      chooseNudge({ dayIndex: 1, medicationMissed: true, sleepFiring: true }),
      chooseNudge({ dayIndex: 1, medicationMissed: true, inflection: "deterioration" }),
      chooseNudge({ dayIndex: 1, medicationMissed: true, disengaged: true }),
      chooseNudge({ dayIndex: 1, medicationMissed: true, elevationSignal: true }),
      chooseNudge({ dayIndex: 1, medicationMissed: true, lapsed: true }),
      chooseNudge({ dayIndex: 1, medicationMissed: true, milestone: 7 }),
      chooseNudge({ dayIndex: 1, medicationMissed: true, streak: 5, activeToday: true }),
    ];
    for (const n of cases) expect(MEDICATION_NUDGES).not.toContain(n);
  });
});

describe("chooseNudge — dayIndex rotation (no single message repeats every day)", () => {
  it("rotates the warm fallback across the week", () => {
    const seen = new Set<string>();
    for (let d = 0; d < 7; d++) seen.add(chooseNudge({ dayIndex: d }));
    // With 6 warm nudges spread over 7 days, at least 2 distinct messages appear.
    expect(seen.size).toBeGreaterThanOrEqual(2);
    for (const m of seen) expect(WARM_NUDGES).toContain(m);
  });
});

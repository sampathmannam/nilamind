import { describe, it, expect, vi, beforeEach } from "vitest";

// Reuses notifications.ts's existing scheduleReminderAt (the same primitive syncDailyReminders/EMA use) —
// mock it so we can assert WHAT was scheduled without a device.
const scheduleReminderAtMock = vi.fn();
vi.mock("./notifications", () => ({
  scheduleReminderAt: (...args: unknown[]) => scheduleReminderAtMock(...args),
}));

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import {
  offerPostCrisisCheckIn,
  declinePostCrisisCheckIn,
  isPostCrisisCheckInOffered,
  POST_CRISIS_CHECKIN_BODY,
} from "./postCrisisCheckIn";

beforeEach(() => {
  store.clear();
  scheduleReminderAtMock.mockReset();
  scheduleReminderAtMock.mockResolvedValue({ ok: true });
});

describe("postCrisisCheckIn — opt-in, content-free, never silent (2026-07-12 Wave 3, Task 1.4)", () => {
  it("opting in schedules exactly one local notification with generic, content-free copy", () => {
    offerPostCrisisCheckIn();
    expect(scheduleReminderAtMock).toHaveBeenCalledOnce();
    const [, body] = scheduleReminderAtMock.mock.calls[0] as [Date, string];
    expect(body).toBe(POST_CRISIS_CHECKIN_BODY);
    // Privacy — matches notifications.ts's existing content-free lock-screen discipline: never leak that this
    // was crisis-adjacent.
    expect(body.toLowerCase()).not.toContain("crisis");
  });

  it("marks the offer as recorded (secureLocal, best-effort)", () => {
    expect(isPostCrisisCheckInOffered()).toBe(false);
    offerPostCrisisCheckIn();
    expect(isPostCrisisCheckInOffered()).toBe(true);
  });

  it("schedules for a few hours later (suggested 3-6h band), never immediately", () => {
    const before = Date.now();
    offerPostCrisisCheckIn();
    const [when] = scheduleReminderAtMock.mock.calls[0] as [Date, string];
    const deltaHours = (when.getTime() - before) / 3_600_000;
    expect(deltaHours).toBeGreaterThanOrEqual(3);
    expect(deltaHours).toBeLessThanOrEqual(6);
  });

  it("declining (opting out) schedules nothing and does not mark the offer as accepted", () => {
    declinePostCrisisCheckIn();
    expect(scheduleReminderAtMock).not.toHaveBeenCalled();
    expect(isPostCrisisCheckInOffered()).toBe(false);
  });

  it("never schedules unless offerPostCrisisCheckIn is explicitly called (no auto-fire)", () => {
    expect(scheduleReminderAtMock).not.toHaveBeenCalled();
    expect(isPostCrisisCheckInOffered()).toBe(false);
  });
});

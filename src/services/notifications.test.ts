import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Capacitor plugin so we can assert scheduling behaviour without a device.
const checkPermissions = vi.fn();
const schedule = vi.fn();
const cancel = vi.fn();
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    checkPermissions: (...a: unknown[]) => checkPermissions(...a),
    schedule: (...a: unknown[]) => schedule(...a),
    requestPermissions: vi.fn(),
    cancel: (...a: unknown[]) => cancel(...a),
  },
}));
// notifications.ts imports ./reminders — stub it (unused by notifyReplyReady).
// EMA + suppression + reminder deps — controllable via emaMocks (vi.hoisted so the mock factories can read it).
const emaMocks = vi.hoisted(() => ({ enabled: true, frequency: 2, suppressed: false, elevation: "none" as string, times: [] as Date[], dailyEnabled: false, markSuppressCalls: 0, dnd: false, skip: false, budget: 3, catCheckin: true, catInsight: true }));
vi.mock("./reminders", () => ({
  withinQuietHours: () => false,
  getReminderPrefs: () => ({ enabled: emaMocks.dailyEnabled, windowStart: "10:00", windowEnd: "20:00", quietStart: "22:00", quietEnd: "08:00" }),
}));
vi.mock("./emaPrefs", () => ({ getEmaEnabled: () => emaMocks.enabled, getEmaFrequency: () => emaMocks.frequency }));
vi.mock("./ema", () => ({ planEmaFireTimes: () => emaMocks.times, emaElevationSignal: () => emaMocks.elevation }));
vi.mock("./notificationSuppress", () => ({ isSafetySuppressed: () => emaMocks.suppressed, markSafetySuppression: () => { emaMocks.markSuppressCalls++; } }));
vi.mock("./dnd", () => ({ isDndActive: () => emaMocks.dnd }));
vi.mock("./notificationBudget", () => ({
  peekRemaining: () => emaMocks.budget,
  commitClaim: () => {},
  skipActive: () => emaMocks.skip,
  recordNonCrisisSent: () => {},
}));
vi.mock("./notificationCategories", () => ({
  isCategoryEnabled: (id: string) => (id === "checkin" ? emaMocks.catCheckin : id === "insight" ? emaMocks.catInsight : true),
}));

import { notifyReplyReady } from "./notifications";

beforeEach(() => { checkPermissions.mockReset(); schedule.mockReset(); });

describe("notifyReplyReady — the backgrounded 'Nila replied' ping", () => {
  it("no-ops (never schedules, never prompts) when notification permission isn't granted", async () => {
    checkPermissions.mockResolvedValue({ display: "denied" });
    await notifyReplyReady();
    expect(schedule).not.toHaveBeenCalled();
  });

  it("schedules a CONTENT-FREE ping when permission is granted (never leaks the message)", async () => {
    checkPermissions.mockResolvedValue({ display: "granted" });
    schedule.mockResolvedValue(undefined);
    await notifyReplyReady();
    expect(schedule).toHaveBeenCalledOnce();
    const n = (schedule.mock.calls[0][0] as { notifications: { title: string; body: string }[] }).notifications[0];
    expect(n.title).toBe("NilaMind");
    expect(n.body.toLowerCase()).toContain("replied"); // generic nudge, not conversation text
  });

  it("never throws into the reply path if the plugin/permission call fails", async () => {
    checkPermissions.mockRejectedValue(new Error("no plugin"));
    await expect(notifyReplyReady()).resolves.toBeUndefined();
    expect(schedule).not.toHaveBeenCalled();
  });

  it("does NOT ping when the user is in DND 'give me space' mode", async () => {
    emaMocks.dnd = true;
    checkPermissions.mockResolvedValue({ display: "granted" });
    await notifyReplyReady();
    expect(schedule).not.toHaveBeenCalled();
    emaMocks.dnd = false;
  });
});

describe("syncMedicationReminders — recurring daily med pings", () => {
  beforeEach(() => { checkPermissions.mockReset(); schedule.mockReset(); cancel.mockReset(); });

  it("schedules one daily notification per active daily medication at its time", async () => {
    const { syncMedicationReminders } = await import("./notifications");
    checkPermissions.mockResolvedValue({ display: "granted" });
    schedule.mockResolvedValue(undefined);
    const meds = [{ id: "med_1", name: "Lamotrigine", dose: "200mg", time: "08:30", schedule: "daily" as const, active: true }];
    await syncMedicationReminders(meds);
    expect(schedule).toHaveBeenCalledOnce();
    const n = (schedule.mock.calls[0][0] as { notifications: { title: string; body: string; schedule: Record<string, unknown> }[] }).notifications[0];
    expect(n.title).toBe("NilaMind");
    expect(n.body).toContain("Lamotrigine");
    expect(n.body).toContain("200mg");
    expect(n.schedule).toMatchObject({ on: { hour: 8, minute: 30 }, allowWhileIdle: true });
  });

  it("schedules two notifications for twice-daily meds", async () => {
    const { syncMedicationReminders } = await import("./notifications");
    checkPermissions.mockResolvedValue({ display: "granted" });
    schedule.mockResolvedValue(undefined);
    const meds = [{ id: "med_2", name: "Quetiapine", dose: "25mg", time: "21:00", schedule: "twice_daily" as const, active: true }];
    await syncMedicationReminders(meds);
    expect(schedule).toHaveBeenCalledOnce();
    const notifications = (schedule.mock.calls[0][0] as { notifications: Record<string, unknown>[] }).notifications;
    expect(notifications).toHaveLength(2);
    const hours = notifications.map((n: Record<string, unknown>) => (n.schedule as { on: { hour: number } }).on.hour).sort((a, b) => a - b);
    expect(hours).toEqual([9, 21]);
  });

  it("no-ops silently when permission is denied", async () => {
    const { syncMedicationReminders } = await import("./notifications");
    checkPermissions.mockResolvedValue({ display: "denied" });
    await syncMedicationReminders([{ id: "med_3", name: "X", dose: "1mg", time: "08:00", schedule: "daily" as const, active: true }]);
    expect(schedule).not.toHaveBeenCalled();
  });

  it("cancels previous med reminders before rescheduling", async () => {
    const { syncMedicationReminders } = await import("./notifications");
    checkPermissions.mockResolvedValue({ display: "granted" });
    schedule.mockResolvedValue(undefined);
    await syncMedicationReminders([{ id: "med_4", name: "Y", dose: "5mg", time: "10:00", schedule: "daily" as const, active: true }]);
    expect(cancel).toHaveBeenCalled();
  });
});

describe("syncEmaCheckins — randomized EMA quick check-ins", () => {
  beforeEach(() => {
    checkPermissions.mockReset(); schedule.mockReset(); cancel.mockReset();
    emaMocks.enabled = true; emaMocks.frequency = 2; emaMocks.suppressed = false; emaMocks.elevation = "none";
    emaMocks.times = [new Date(2026, 6, 10, 11, 0), new Date(2026, 6, 10, 20, 0)];
    checkPermissions.mockResolvedValue({ display: "granted" });
    schedule.mockResolvedValue(undefined);
    cancel.mockResolvedValue(undefined);
  });

  it("schedules content-free, tap-tagged pings when enabled + granted + safe", async () => {
    const { syncEmaCheckins } = await import("./notifications");
    const res = await syncEmaCheckins({ request: false });
    expect(res.scheduled).toBe(true);
    expect(cancel).toHaveBeenCalled(); // idempotent clear first
    expect(schedule).toHaveBeenCalledOnce();
    const notifs = (schedule.mock.calls[0][0] as { notifications: { id: number; body: string; extra: { view: string } }[] }).notifications;
    expect(notifs).toHaveLength(2);
    expect(notifs.map((n) => n.id)).toEqual([300000, 300001]);
    for (const n of notifs) {
      expect(n.extra).toEqual({ view: "ema_checkin" });          // content-free routing tag only
      expect(n.body).not.toMatch(/valence|energy|note|\d\/10/i); // never any mood data in the body
    }
  });

  it("bails (cancel-only, schedules nothing) when EMA is disabled", async () => {
    emaMocks.enabled = false;
    const { syncEmaCheckins } = await import("./notifications");
    const res = await syncEmaCheckins({ request: false });
    expect(res).toEqual({ scheduled: false, reason: "disabled" });
    expect(cancel).toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });

  it("bails when a crisis/elevation suppression latch is active — never nudge mid-crisis (P6.4)", async () => {
    emaMocks.suppressed = true;
    const { syncEmaCheckins } = await import("./notifications");
    const res = await syncEmaCheckins({ request: false });
    expect(res.scheduled).toBe(false);
    expect(schedule).not.toHaveBeenCalled();
  });

  it("bails when today's EMA trend is already elevating", async () => {
    emaMocks.elevation = "elevated";
    const { syncEmaCheckins } = await import("./notifications");
    await syncEmaCheckins({ request: false });
    expect(schedule).not.toHaveBeenCalled();
  });

  it("bails (schedules nothing) when the user is in DND 'give me space' mode (P6.7)", async () => {
    emaMocks.dnd = true;
    const { syncEmaCheckins } = await import("./notifications");
    const res = await syncEmaCheckins({ request: false });
    expect(res.scheduled).toBe(false);
    expect(schedule).not.toHaveBeenCalled();
    emaMocks.dnd = false;
  });

  it("bails (schedules nothing) when the per-day budget is exhausted (P6.3)", async () => {
    const now = new Date();
    const t1 = new Date(now); t1.setHours(11, 0, 0, 0);
    const t2 = new Date(now); t2.setHours(20, 0, 0, 0);
    emaMocks.times = [t1, t2]; // both fire today → draw from today's budget
    emaMocks.budget = 0;
    const { syncEmaCheckins } = await import("./notifications");
    const res = await syncEmaCheckins({ request: false });
    expect(res.scheduled).toBe(false);
    expect(schedule).not.toHaveBeenCalled();
    emaMocks.budget = 3;
  });

  it("bails (schedules nothing) when the 'check-in' category is toggled off (P6.5)", async () => {
    const now = new Date();
    const t1 = new Date(now); t1.setHours(11, 0, 0, 0);
    const t2 = new Date(now); t2.setHours(20, 0, 0, 0);
    emaMocks.times = [t1, t2];
    emaMocks.catCheckin = false;
    const { syncEmaCheckins } = await import("./notifications");
    const res = await syncEmaCheckins({ request: false });
    expect(res.scheduled).toBe(false);
    expect(schedule).not.toHaveBeenCalled();
    emaMocks.catCheckin = true;
  });

  it("startup (request:false) never prompts — denied ⇒ schedules nothing", async () => {
    checkPermissions.mockResolvedValue({ display: "denied" });
    const { syncEmaCheckins } = await import("./notifications");
    const res = await syncEmaCheckins({ request: false });
    expect(res).toEqual({ scheduled: false, reason: "denied" });
    expect(schedule).not.toHaveBeenCalled();
  });

  it("clearEmaCheckins cancels the EMA id range", async () => {
    const { clearEmaCheckins } = await import("./notifications");
    await clearEmaCheckins();
    expect(cancel).toHaveBeenCalled();
    const ids = (cancel.mock.calls[0][0] as { notifications: { id: number }[] }).notifications.map((n) => n.id);
    expect(ids).toContain(300000);
  });
});

describe("crisis suppression of nudges (P6.4)", () => {
  beforeEach(() => {
    checkPermissions.mockReset(); schedule.mockReset(); cancel.mockReset();
    emaMocks.suppressed = false; emaMocks.markSuppressCalls = 0; emaMocks.dailyEnabled = true;
    checkPermissions.mockResolvedValue({ display: "granted" });
    schedule.mockResolvedValue(undefined); cancel.mockResolvedValue(undefined);
  });

  it("suppressNudgesForCrisis latches the 24h window and cancels BOTH the EMA and the daily nudges", async () => {
    const { suppressNudgesForCrisis } = await import("./notifications");
    await suppressNudgesForCrisis();
    expect(emaMocks.markSuppressCalls).toBe(1); // 24h latch set
    const cancelledIds = cancel.mock.calls.flatMap((c) => (c[0] as { notifications: { id: number }[] }).notifications.map((n) => n.id));
    expect(cancelledIds).toContain(300000); // EMA range
    expect(cancelledIds).toContain(1001);   // daily nudge id
  });

  it("syncDailyReminders bails cancel-only (reason 'unavailable') inside a crisis window", async () => {
    emaMocks.suppressed = true; // daily reminder is ENABLED, but a crisis window is open
    const { syncDailyReminders } = await import("./notifications");
    const res = await syncDailyReminders();
    expect(res).toEqual({ scheduled: false, reason: "unavailable" });
    expect(schedule).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled(); // still clears the prior schedule first
  });

  it("syncDailyReminders bails cancel-only when the user is in DND 'give me space' mode (P6.7)", async () => {
    emaMocks.dnd = true;
    const { syncDailyReminders } = await import("./notifications");
    const res = await syncDailyReminders();
    expect(res).toEqual({ scheduled: false, reason: "unavailable" });
    expect(schedule).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
    emaMocks.dnd = false;
  });

  it("syncDailyReminders bails (reason 'unavailable') when the per-day budget is exhausted (P6.3)", async () => {
    emaMocks.budget = 0;
    const { syncDailyReminders } = await import("./notifications");
    const res = await syncDailyReminders();
    expect(res).toEqual({ scheduled: false, reason: "unavailable" });
    expect(schedule).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
    emaMocks.budget = 3;
  });

  it("syncDailyReminders bails (reason 'disabled') when the 'insight' category is toggled off (P6.5)", async () => {
    emaMocks.catInsight = false;
    const { syncDailyReminders } = await import("./notifications");
    const res = await syncDailyReminders();
    expect(res).toEqual({ scheduled: false, reason: "disabled" });
    expect(schedule).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
    emaMocks.catInsight = true;
  });
});

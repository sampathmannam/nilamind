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
vi.mock("./reminders", () => ({ withinQuietHours: () => false, getReminderPrefs: () => ({ enabled: false }) }));
// EMA scheduling deps — controllable via emaMocks (vi.hoisted so the hoisted mock factories can read it).
const emaMocks = vi.hoisted(() => ({ enabled: true, frequency: 2, suppressed: false, elevation: "none" as string, times: [] as Date[] }));
vi.mock("./emaPrefs", () => ({ getEmaEnabled: () => emaMocks.enabled, getEmaFrequency: () => emaMocks.frequency }));
vi.mock("./ema", () => ({ planEmaFireTimes: () => emaMocks.times, emaElevationSignal: () => emaMocks.elevation }));
vi.mock("./notificationSuppress", () => ({ isSafetySuppressed: () => emaMocks.suppressed }));

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

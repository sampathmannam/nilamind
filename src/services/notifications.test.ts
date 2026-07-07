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

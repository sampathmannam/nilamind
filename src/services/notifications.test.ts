import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Capacitor plugin so we can assert scheduling behaviour without a device.
const checkPermissions = vi.fn();
const schedule = vi.fn();
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    checkPermissions: (...a: unknown[]) => checkPermissions(...a),
    schedule: (...a: unknown[]) => schedule(...a),
    requestPermissions: vi.fn(),
    cancel: vi.fn(),
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

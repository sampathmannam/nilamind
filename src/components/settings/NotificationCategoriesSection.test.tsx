// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const catMocks = vi.hoisted(() => ({
  prefs: { checkin: true, armed: true, insight: true, protocol: true, crisis_followup: true },
  setEnabled: vi.fn(),
  syncEma: vi.fn().mockResolvedValue(undefined),
  syncDaily: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../services/notificationCategories", () => ({
  NOTIFICATION_CATEGORIES: [
    { id: "checkin", label: "Check-in reminders", description: "EMA" },
    { id: "armed", label: "Armed check-ins", description: "armed" },
    { id: "insight", label: "Insight nudges", description: "daily" },
    { id: "protocol", label: "Protocol continuation", description: "protocol" },
    { id: "crisis_followup", label: "Crisis follow-up", description: "aftercare" },
  ],
  getCategoryPrefs: () => ({ ...catMocks.prefs }),
  setCategoryEnabled: (id: string, on: boolean) => catMocks.setEnabled(id, on),
  isCategoryEnabled: (id: string) => (catMocks.prefs as any)[id] !== false,
}));
vi.mock("../../services/notifications", () => ({
  syncEmaCheckins: (...a: unknown[]) => catMocks.syncEma(...a),
  syncDailyReminders: (...a: unknown[]) => catMocks.syncDaily(...a),
}));

import NotificationCategoriesSection from "./NotificationCategoriesSection";

afterEach(cleanup);
beforeEach(() => {
  catMocks.prefs = { checkin: true, armed: true, insight: true, protocol: true, crisis_followup: true };
  catMocks.setEnabled.mockClear();
  catMocks.syncEma.mockClear();
  catMocks.syncDaily.mockClear();
});

describe("NotificationCategoriesSection — P6.5", () => {
  it("renders all five category toggles, all on by default", () => {
    render(<NotificationCategoriesSection />);
    for (const id of ["checkin", "armed", "insight", "protocol", "crisis_followup"]) {
      const sw = screen.getByRole("switch", { name: labelFor(id) });
      expect(sw).toBeTruthy();
      expect(sw.getAttribute("aria-checked")).toBe("true");
    }
  });

  it("toggling a category writes the pref and re-syncs notifications", () => {
    render(<NotificationCategoriesSection />);
    const sw = screen.getByRole("switch", { name: /Check-in reminders/i });
    fireEvent.click(sw);
    expect(catMocks.setEnabled).toHaveBeenCalledWith("checkin", false);
    expect(catMocks.syncEma).toHaveBeenCalled();
    expect(catMocks.syncDaily).toHaveBeenCalled();
  });
});

function labelFor(id: string): RegExp {
  const map: Record<string, RegExp> = {
    checkin: /Check-in reminders/i,
    armed: /Armed check-ins/i,
    insight: /Insight nudges/i,
    protocol: /Protocol continuation/i,
    crisis_followup: /Crisis follow-up/i,
  };
  return map[id];
}

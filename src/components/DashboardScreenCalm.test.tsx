// @vitest-environment jsdom
// Regression test for review item #F (calm-state band openness).
// Mocks the data-loading services with a realistic CALM profile and mounts the REAL
// DashboardScreen, then asserts the calm-open contract AND that the opened bands
// contain real content (proving "alive", not empty). Guards against a future change
// that collapses everything and makes the good-day dashboard feel broken/empty.
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

vi.mock("../services/modeEngine", async (importActual) => ({
  ...(await importActual<typeof import("../services/modeEngine")>()),
  getUserState: vi.fn(),
}));
vi.mock("../services/moodHistory", () => ({
  loadMoodHistory: () => Array.from({ length: 20 }, (_, i) => ({
    date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
    intensity: 3 + (i % 3),
    sleepHours: 7.5,
    socialInteraction: 3,
    emotion: "okay",
  })),
}));
vi.mock("../services/checkin", () => ({
  loadCheckins: () => Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
    intensity: 3 + (i % 3),
    sleepHours: 7.5,
    socialInteraction: 3,
    emotion: "okay",
  })),
}));
vi.mock("../services/streaks", () => ({
  computeStreak: () => ({ current: 4, longest: 9, totalActiveDays: 40, freezesUsed: 0, freezesLeft: 3 }),
  computeCompassionateStreak: () => ({
    message: "4 days in a row — gently done.",
    emoji: "💙", current: 4, milestone: null, lapsed: false,
    activeToday: true, daysSinceLast: 0, totalActiveDays: 40,
  }),
}));
vi.mock("../services/nilaSessions", () => ({
  nilaStats: () => ({
    recent: Array.from({ length: 8 }, (_, i) => ({
      id: `s${i}`, snippet: `note ${i}`, surface: "coach",
      date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), timestamp: "0",
    })),
    last7: 3,
  }),
}));

import { getUserState } from "../services/modeEngine";
import DashboardScreen from "./DashboardScreen";

describe("#F calm-state openness — drive real DashboardScreen with calm profile", () => {
  beforeEach(() => {
    (getUserState as unknown as ReturnType<typeof vi.fn>).mockReturnValue("calm");
  });
  afterEach(cleanup);

  it("calm opens Activity+Tracking+Trends and the open bands contain real content (not empty)", () => {
    const { container } = render(<DashboardScreen />);
    const find = (re: RegExp) => screen.getAllByRole("button").find((b) => re.test(b.textContent || ""));
    expect(find(/Your activity/)!.getAttribute("aria-expanded")).toBe("true");
    expect(find(/Tracking/)!.getAttribute("aria-expanded")).toBe("true");
    expect(find(/Trends/)!.getAttribute("aria-expanded")).toBe("true");
    expect(find(/Signals/)!.getAttribute("aria-expanded")).toBe("false");
    expect(find(/Episodes/)!.getAttribute("aria-expanded")).toBe("false");

    // Content present in opened bands — proves the screen is alive, not empty.
    const monthCard = screen.queryByText(/Your month/i);
    const streak = screen.getAllByText(/days in a row|gently done|active days/i);
    const sessions = screen.queryAllByText(/note \d/);
    const chartSvg = container.querySelectorAll("svg.recharts-surface, svg").length;
    console.log("[#F] monthCard:", !!monthCard, "| streakMatches:", streak.length, "| sessions:", sessions.length, "| svgs:", chartSvg);
    // The decisive check: an opened band actually shows user data.
    expect(streak.length).toBeGreaterThan(0);
    expect(Boolean(monthCard) || sessions.length > 0 || chartSvg > 0).toBe(true);
  });
});

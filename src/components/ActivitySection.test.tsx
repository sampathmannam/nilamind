// @vitest-environment jsdom
// 15-day longitudinal run (2026-08-24): the usage strip printed an ALL-TIME mood mean with no window
// label, directly below the dashboard's 7-day hero average. At day 15 the same screen read "4.1" at
// the top and "3.7" here — two different windows, presented as if they were the same measure, with
// nothing on screen distinguishing them. Mood is reported twice already, each with an explicit
// window (the 7-day hero, and the "this month … (min–max)" narrative). This pins the usage strip to
// usage facts only, so a third unlabelled reading of the same measure cannot come back.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("../services/secureLocal", () => ({
  secureLocal: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));
vi.mock("../services/achievements", () => ({
  getAllAchievements: () => [],
  getAchievementCount: () => 0,
}));

import ActivitySection from "./ActivitySection";
import type { UsageSummary } from "../services/usageAnalytics";
import type { ProtocolAdherenceSummary } from "../services/protocolAdherence";

afterEach(cleanup);

const usageSummary = {
  totalCheckins: 13,
  avgMood: 3.7, // all-time mean — must never be rendered as a bare number
  topEmotion: "okay",
  features: ["values_snapshot"],
  protocols: { completed: 2 },
  assessments: {},
  moodSleepCorrelation: null,
} as unknown as UsageSummary;

const props = {
  streak: { current: 7, longest: 9 } as ReturnType<typeof import("../services/streaks").computeStreak>,
  compassionateStreak: {
    current: 7, longest: 9, totalActiveDays: 13, daysSinceLast: 0,
    message: "7 days of showing up", emoji: "🌱", lapsed: false, milestone: null,
  } as unknown as ReturnType<typeof import("../services/streaks").computeCompassionateStreak>,
  freq14: 12,
  nilaChats7d: 4,
  usageSummary,
  protocolAdherence: { started: 2, completed: 2, completionRate: 1 } as unknown as ProtocolAdherenceSummary,
};

describe("ActivitySection — usage strip reports usage, not a second mood average", () => {
  it("does not print the all-time mood mean (it contradicts the labelled 7-day hero)", () => {
    render(<ActivitySection {...props} />);
    expect(screen.queryByText(/avg mood/i)).toBeNull();
    expect(screen.queryByText(/3\.7/)).toBeNull();
  });

  it("still shows the usage facts that belong here", () => {
    render(<ActivitySection {...props} />);
    expect(screen.getByText(/okay/i)).toBeTruthy();      // top emotion
    expect(screen.getByText(/values set/i)).toBeTruthy(); // values snapshot
    expect(screen.getByText("13")).toBeTruthy();          // check-in count
  });

  it("renders nothing in that row when there is no usage fact to state", () => {
    const bare = {
      ...props,
      usageSummary: { ...usageSummary, topEmotion: null, features: [] } as unknown as UsageSummary,
    };
    render(<ActivitySection {...bare} />);
    expect(screen.queryByText(/top:/i)).toBeNull();
    expect(screen.queryByText(/values set/i)).toBeNull();
  });
});

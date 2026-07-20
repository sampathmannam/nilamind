// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import DashboardCharts from "./DashboardCharts";

afterEach(() => { vi.restoreAllMocks(); });

const baseProps = {
  timeRange: "30d" as const,
  setTimeRange: vi.fn(),
  chartTab: "emotion" as const,
  setChartTab: vi.fn(),
  emotionTrendWithEma: [{ date: "2026-07-01", intensity: 5, emaIntensity: 4 }],
  energyScatter: [{ intensity: 5, energy: 2 }],
  sleepMoodTrendData: [{ date: "2026-07-01", sleepHours: 7, intensity: 5 }],
  ctxTrend: [{ date: "2026-07-01", sleepHours: 7, intensity: 5, social: 3 }],
  emoBars: [{ name: "calm", value: 3 }],
  weeklyBars: [{ day: "Mon", avg: 4, count: 2 }],
  trendLength: 3,
};

describe("DashboardCharts", () => {
  it("renders the Trend heading and tab controls", () => {
    render(<DashboardCharts {...baseProps} />);
    expect(screen.getByText("Trend")).toBeTruthy();
    expect(screen.getByLabelText("Show emotion trend")).toBeTruthy();
    expect(screen.getByLabelText("Show 30 day trend")).toBeTruthy();
  });

  it("shows the empty fallback when trendLength < 2", () => {
    render(<DashboardCharts {...baseProps} trendLength={0} />);
    expect(screen.getAllByText(/trend will appear here/i).length).toBeGreaterThan(0);
  });

  it("renders emotion + weekly bar charts when data present", () => {
    render(<DashboardCharts {...baseProps} />);
    expect(screen.getAllByText("Emotion log frequency").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Weekly rhythm").length).toBeGreaterThan(0);
  });
});

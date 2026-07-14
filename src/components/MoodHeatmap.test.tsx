import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/secureLocal", async () => {
  const actual = await vi.importActual<typeof import("../services/secureLocal")>("../services/secureLocal");
  return { ...actual };
});

import { render, screen } from "@testing-library/react";
import React from "react";
import MoodHeatmap from "./MoodHeatmap";
import type { MoodPoint } from "../services/patternInsights";

// @vitest-environment jsdom

beforeEach(() => {
  document.body.innerHTML = "";
});

const makeMoods = (count: number, intensity: number): MoodPoint[] => {
  const moods: MoodPoint[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    moods.push({ date: d.toISOString().split("T")[0], intensity });
  }
  return moods;
};

describe("MoodHeatmap", () => {
  it("renders without crashing", () => {
    render(<MoodHeatmap moods={[]} days={30} />);
    expect(document.querySelector("[role='img']")).toBeTruthy();
  });

  it("renders colored dots for mood data", () => {
    const moods = makeMoods(10, 5);
    const { container } = render(<MoodHeatmap moods={moods} days={30} />);
    const dots = container.querySelectorAll(".rounded-sm");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("renders the legend with calm/distressed labels", () => {
    render(<MoodHeatmap moods={[]} days={30} />);
    expect(screen.getByText("Calm")).toBeTruthy();
    expect(screen.getByText("Distressed")).toBeTruthy();
    expect(screen.getByText("No data")).toBeTruthy();
  });

  it("handles empty mood data gracefully", () => {
    render(<MoodHeatmap moods={[]} days={30} />);
    expect(document.querySelector("[role='img']")).toBeTruthy();
  });

  it("renders with different day counts", () => {
    const moods = makeMoods(5, 3);
    const { container } = render(<MoodHeatmap moods={moods} days={90} />);
    expect(container.querySelector("[role='img']")).toBeTruthy();
  });
});

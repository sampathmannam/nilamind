import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/secureLocal", async () => {
  const actual = await vi.importActual<typeof import("../services/secureLocal")>("../services/secureLocal");
  return { ...actual };
});

import { render, screen } from "@testing-library/react";
import React from "react";
import TrendChart from "./TrendChart";
import { PHQ9_BANDS } from "./TrendChart";

// @vitest-environment jsdom

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("TrendChart", () => {
  it("renders empty state when no data", () => {
    render(<TrendChart data={[]} title="PHQ-9 Trend" />);
    expect(screen.getByText("PHQ-9 Trend")).toBeTruthy();
    expect(screen.getByText(/No data yet/)).toBeTruthy();
  });

  it("renders chart when data is provided", () => {
    const data = [
      { date: "2026-01-01", score: 12, severity: "moderate" },
      { date: "2026-01-15", score: 8, severity: "mild" },
      { date: "2026-02-01", score: 5, severity: "mild" },
    ];
    const { container } = render(<TrendChart data={data} title="PHQ-9 Trend" bands={PHQ9_BANDS} maxScore={27} />);
    expect(container.querySelector("[role='img']")).toBeTruthy();
  });

  it("renders severity legend", () => {
    const data = [{ date: "2026-01-01", score: 10 }];
    render(<TrendChart data={data} title="Test" bands={PHQ9_BANDS} />);
    expect(screen.getByText("Minimal")).toBeTruthy();
    expect(screen.getByText("Mild")).toBeTruthy();
    expect(screen.getByText("Moderate")).toBeTruthy();
  });

  it("shows trend badge when 2+ data points", () => {
    const data = [
      { date: "2026-01-01", score: 15 },
      { date: "2026-02-01", score: 5 },
    ];
    render(<TrendChart data={data} title="Test" />);
    expect(screen.getByText(/Improving/)).toBeTruthy();
  });

  it("shows stable badge when scores are close", () => {
    const data = [
      { date: "2026-01-01", score: 10 },
      { date: "2026-02-01", score: 11 },
    ];
    render(<TrendChart data={data} title="Test" />);
    expect(screen.getByText("Stable")).toBeTruthy();
  });
});

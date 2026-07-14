import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/secureLocal", async () => {
  const actual = await vi.importActual<typeof import("../services/secureLocal")>("../services/secureLocal");
  return { ...actual };
});

import { render, screen } from "@testing-library/react";
import React from "react";
import PhaseTimeline from "./PhaseTimeline";
import type { EpisodeMarker } from "../services/episodeMarker";

// @vitest-environment jsdom

beforeEach(() => {
  document.body.innerHTML = "";
});

const marker = (over: Partial<EpisodeMarker> = {}): EpisodeMarker => ({
  id: "m1",
  startDate: "2026-01-01",
  endDate: "2026-01-31",
  phase: "elevated",
  note: "",
  createdAt: "2026-01-01T10:00:00",
  ...over,
});

describe("PhaseTimeline", () => {
  it("renders empty state when no markers", () => {
    render(<PhaseTimeline markers={[]} />);
    expect(screen.getByText(/No episodes logged yet/)).toBeTruthy();
  });

  it("renders the timeline bar when markers exist", () => {
    const markers = [marker(), marker({ id: "m2", phase: "stable", startDate: "2026-02-01", endDate: "2026-02-28" })];
    const { container } = render(<PhaseTimeline markers={markers} days={365} />);
    expect(container.querySelector("[role='img']")).toBeTruthy();
    expect(screen.getAllByText("Elevated").length).toBeGreaterThan(0);
  });

  it("renders phase legend", () => {
    render(<PhaseTimeline markers={[marker()]} />);
    expect(screen.getAllByText("Elevated").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Depressed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mixed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stable").length).toBeGreaterThan(0);
  });

  it("shows recent markers in the list", () => {
    const markers = [marker({ startDate: "2026-06-01", endDate: "2026-06-15" })];
    render(<PhaseTimeline markers={markers} />);
    expect(screen.getByText("2026-06-01 – 2026-06-15")).toBeTruthy();
  });
});

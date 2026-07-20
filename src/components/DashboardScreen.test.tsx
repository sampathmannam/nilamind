// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import React from "react";

vi.mock("../services/modeEngine", async (importActual) => ({
  ...(await importActual<typeof import("../services/modeEngine")>()),
  getUserState: vi.fn(),
}));

import DashboardScreen from "./DashboardScreen";
import { getUserState } from "../services/modeEngine";

beforeEach(() => {
  (getUserState as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
});

afterEach(cleanup);

describe("DashboardScreen capacity-aware bands (Phase 3)", () => {
  it("low-capacity state adds the soft-register class and keeps bands collapsed", () => {
    (getUserState as unknown as ReturnType<typeof vi.fn>).mockReturnValue("low");
    const { container } = render(<DashboardScreen />);
    const group = container.querySelector(".soft-register");
    expect(group).toBeTruthy();
    // Every band header starts collapsed under low capacity.
    const headers = screen.getAllByRole("button").filter((b) =>
      /Your activity|Tracking|Signals|Patterns|Trends|Measures|Episodes|Sessions/.test(b.textContent || ""),
    );
    for (const h of headers) expect(h.getAttribute("aria-expanded")).toBe("false");
  });

  it("calm state opens the activity band and skips the soft register", () => {
    (getUserState as unknown as ReturnType<typeof vi.fn>).mockReturnValue("calm");
    const { container } = render(<DashboardScreen />);
    expect(container.querySelector(".soft-register")).toBeNull();
    const activity = screen.getAllByRole("button").find((b) => /Your activity/.test(b.textContent || ""));
    expect(activity?.getAttribute("aria-expanded")).toBe("true");
  });

  it("null state is neutral: no soft register, bands collapsed", () => {
    (getUserState as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const { container } = render(<DashboardScreen />);
    expect(container.querySelector(".soft-register")).toBeNull();
    const activity = screen.getAllByRole("button").find((b) => /Your activity/.test(b.textContent || ""));
    expect(activity?.getAttribute("aria-expanded")).toBe("false");
  });

  it("#12 quiet-hours nudge appears for elevated users after a few minutes and is dismissible", () => {
    vi.useFakeTimers();
    try {
      (getUserState as unknown as ReturnType<typeof vi.fn>).mockReturnValue("elevated");
      render(<DashboardScreen />);
      expect(screen.queryByText(/been here 3 minutes/i)).toBeNull();
      act(() => vi.advanceTimersByTime(3 * 60_000 + 1000));
      const nudge = screen.getByText(/been here 3 minutes/i);
      expect(nudge).toBeTruthy();
      fireEvent.click(screen.getByLabelText("Dismiss"));
      expect(screen.queryByText(/been here 3 minutes/i)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("#12 quiet-hours nudge does NOT appear for a calm user", () => {
    vi.useFakeTimers();
    try {
      (getUserState as unknown as ReturnType<typeof vi.fn>).mockReturnValue("calm");
      render(<DashboardScreen />);
      act(() => vi.advanceTimersByTime(5 * 60_000));
      expect(screen.queryByText(/been here/i)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

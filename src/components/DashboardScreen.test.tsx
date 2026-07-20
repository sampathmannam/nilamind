// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
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
});

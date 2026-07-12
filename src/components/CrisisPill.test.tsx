// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// Crisis affordance component. Used on pre-app gate screens where the app-level CrisisOverlay isn't
// available yet. Routes to the App-level CrisisOverlay via onActivate → activateCrisis (which also
// latches the 24h no-nudge window).
import CrisisPill from "./CrisisPill";
import { t } from "../services/i18n";

afterEach(cleanup);

describe("CrisisPill — crisis affordance component", () => {
  it("renders a single tappable button", () => {
    render(<CrisisPill onActivate={() => {}} />);
    expect(screen.getAllByRole("button").length).toBe(1);
  });

  it("has an accessible name (not icon-only — labelled for discoverability/a11y)", () => {
    render(<CrisisPill onActivate={() => {}} />);
    // Accessible name resolves to the crisis label in the active language (en/hi).
    expect(screen.getByRole("button", { name: t("crisisButton") })).toBeTruthy();
  });

  it("shows a VISIBLE text label, not just an icon", () => {
    render(<CrisisPill onActivate={() => {}} />);
    // A real visible text node (nav-label-icon rule) — proves it isn't an icon-only control.
    expect(screen.getByText(t("crisisButton"))).toBeTruthy();
  });

  it("calls onActivate exactly once when tapped", () => {
    const onActivate = vi.fn();
    render(<CrisisPill onActivate={onActivate} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it("meets the 44px minimum touch target", () => {
    render(<CrisisPill onActivate={() => {}} />);
    expect(screen.getByRole("button").className).toMatch(/min-h-\[44px\]/);
  });
});

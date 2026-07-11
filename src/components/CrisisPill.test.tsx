// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// The in-app persistent crisis affordance. Before this, crisis was reachable ONLY from the Nila tab
// (ModeScreen's icon-only header LifeBuoy) — Tools and You had no one-tap crisis (§9 "crisis always
// reachable"). CrisisPill lives in the app shell, outside every tab branch, so it persists on all tabs.
// Unlike CrisisHelpButton (the pre-app gate affordance with its own offline panel), this routes to the
// App-level CrisisOverlay via onActivate → activateCrisis (which also latches the 24h no-nudge window).
import CrisisPill from "./CrisisPill";
import { t } from "../services/i18n";

afterEach(cleanup);

describe("CrisisPill — persistent in-app crisis affordance", () => {
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

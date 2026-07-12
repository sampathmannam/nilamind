// @vitest-environment jsdom
// CountdownRing — pure presentational SVG ring primitive extracted from BreathingTimer.tsx's ring
// shell (2026-07-12 Wave 3, Group E: TIPP tool). Generalized so both the cyclic breathing timer and
// TIPP's fixed-duration Temperature/Intense-exercise countdowns can share one visual.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CountdownRing from "./CountdownRing";

afterEach(cleanup);

describe("CountdownRing", () => {
  it("renders an accessible svg ring with the given aria-label", () => {
    render(<CountdownRing progress={0.5} label="Breathe in" color="#60A5FA" ariaLabel="Breathing exercise: Breathe in" />);
    const svg = screen.getByRole("img", { name: "Breathing exercise: Breathe in" });
    expect(svg).toBeTruthy();
  });

  it("renders the label text", () => {
    render(<CountdownRing progress={0.2} label="Cold water" color="#22D3EE" ariaLabel="Cold water countdown" />);
    expect(screen.getByText("Cold water")).toBeTruthy();
  });

  it("does not show a remaining-time caption when durationMs is omitted", () => {
    render(<CountdownRing progress={0.3} label="Breathe in" color="#60A5FA" ariaLabel="x" />);
    expect(screen.queryByText(/remaining/i)).toBeNull();
  });

  it("shows a remaining-time caption computed from durationMs and progress when durationMs is given", () => {
    render(<CountdownRing progress={0} label="Cold water" color="#22D3EE" ariaLabel="x" durationMs={45000} />);
    expect(screen.getByText(/45s remaining/i)).toBeTruthy();
  });

  it("remaining-time caption counts down as progress increases", () => {
    render(<CountdownRing progress={0.8} label="Cold water" color="#22D3EE" ariaLabel="x" durationMs={30000} />);
    expect(screen.getByText(/6s remaining/i)).toBeTruthy();
  });
});

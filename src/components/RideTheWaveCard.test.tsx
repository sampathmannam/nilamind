// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import RideTheWaveCard from "./RideTheWaveCard";

afterEach(cleanup);

describe("RideTheWaveCard — de-escalation content (the 'left with nothing' gap)", () => {
  it("renders the heading and the wave/temporal framing", () => {
    render(<RideTheWaveCard />);
    expect(screen.getByText(/ride out the next few minutes/i)).toBeTruthy();
    expect(screen.getByText(/rise, peak, and pass/i)).toBeTruthy();
  });

  it("renders the cold-water technique with the medical caveat", () => {
    render(<RideTheWaveCard />);
    // "cold water" also appears in the vignette below, so assert at least one match rather than uniqueness.
    expect(screen.getAllByText(/cold water/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/beta blockers/i)).toBeTruthy();
  });

  it("lets the user rate urge intensity 0-10 and shows a running history", () => {
    render(<RideTheWaveCard />);
    fireEvent.click(screen.getByLabelText("Rate intensity 8 out of 10"));
    expect(document.getElementById("urge-rating-history")?.textContent).toMatch(/8/);
    fireEvent.click(screen.getByLabelText("Rate intensity 5 out of 10"));
    expect(document.getElementById("urge-rating-history")?.textContent).toMatch(/8 → 5/);
  });

  it("includes a method-free coping vignette and a generic means-safety line", () => {
    render(<RideTheWaveCard />);
    expect(screen.getByText(/something people say afterward/i)).toBeTruthy();
    expect(screen.getByText(/distance between you and it/i)).toBeTruthy();
  });

  it("never names a specific method (safe-messaging constraint)", () => {
    render(<RideTheWaveCard />);
    const text = document.getElementById("ride-the-wave-card")?.textContent ?? "";
    expect(text.toLowerCase()).not.toMatch(/overdose|pills|rope|jump|gun|blade|razor/);
  });
});

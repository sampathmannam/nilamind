// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import ProgressRing from "./ProgressRing";

afterEach(() => cleanup());

describe("ProgressRing", () => {
  it("renders an SVG ring with correct percentage", () => {
    render(<ProgressRing value={75} label="Completion" />);
    const ring = screen.getByRole("progressbar");
    expect(ring).toBeTruthy();
    expect(ring.getAttribute("aria-valuenow")).toBe("75");
    expect(ring.getAttribute("aria-valuemax")).toBe("100");
    expect(ring.getAttribute("aria-valuemin")).toBe("0");
  });

  it("displays the label text", () => {
    render(<ProgressRing value={50} label="Adherence" />);
    expect(screen.getByText("Adherence")).toBeTruthy();
  });

  it("displays percentage when showPercent is true", () => {
    render(<ProgressRing value={80} label="Progress" showPercent />);
    expect(screen.getByText("80%")).toBeTruthy();
  });

  it("hides percentage when showPercent is false (default)", () => {
    const { container } = render(<ProgressRing value={80} label="Progress" />);
    const textEl = container.querySelector("text");
    expect(textEl).toBeNull();
  });

  it("clamps value to 0-100", () => {
    render(<ProgressRing value={150} label="Progress" showPercent />);
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("handles zero value", () => {
    render(<ProgressRing value={0} label="Progress" showPercent />);
    const ring = screen.getByRole("progressbar");
    expect(ring.getAttribute("aria-valuenow")).toBe("0");
  });

  it("renders SVG circle elements", () => {
    const { container } = render(<ProgressRing value={60} label="Progress" />);
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(2); // track + filled
  });

  it("applies custom size", () => {
    const { container } = render(<ProgressRing value={50} label="Progress" size={80} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("80");
    expect(svg?.getAttribute("height")).toBe("80");
  });

  it("applies custom className", () => {
    const { container } = render(<ProgressRing value={50} label="Progress" className="mt-4" />);
    expect(container.firstChild).toBeTruthy();
  });
});

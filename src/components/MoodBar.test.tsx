// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import MoodBar, { MoodBarRow } from "./MoodBar";

afterEach(() => cleanup());

describe("MoodBar", () => {
  it("renders a horizontal bar with correct width percentage", () => {
    render(<MoodBar value={7} max={10} label="Mood" />);
    const bar = screen.getByRole("meter");
    expect(bar).toBeTruthy();
    expect(bar.getAttribute("aria-valuenow")).toBe("7");
    expect(bar.getAttribute("aria-valuemax")).toBe("10");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
  });

  it("displays the label text", () => {
    render(<MoodBar value={5} max={10} label="Energy" />);
    expect(screen.getByText("Energy")).toBeTruthy();
  });

  it("displays the value as text when showValue is true", () => {
    render(<MoodBar value={8} max={10} label="Mood" showValue />);
    expect(screen.getByText("8/10")).toBeTruthy();
  });

  it("hides value text when showValue is false (default)", () => {
    const { container } = render(<MoodBar value={8} max={10} label="Mood" />);
    const valueSpan = container.querySelector(".tabular-nums");
    expect(valueSpan).toBeNull();
  });

  it("clamps value to max", () => {
    render(<MoodBar value={15} max={10} label="Mood" showValue />);
    expect(screen.getByText("10/10")).toBeTruthy();
  });

  it("handles zero value", () => {
    render(<MoodBar value={0} max={10} label="Mood" showValue />);
    expect(screen.getByText("0/10")).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(<MoodBar value={5} max={10} label="Mood" className="mt-4" />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe("MoodBarRow", () => {
  it("renders multiple MoodBars vertically", () => {
    render(
      <MoodBarRow>
        <MoodBar value={7} max={10} label="Mood" />
        <MoodBar value={5} max={10} label="Energy" />
        <MoodBar value={8} max={10} label="Sleep" />
      </MoodBarRow>
    );
    expect(screen.getAllByText("Mood").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Energy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sleep").length).toBeGreaterThan(0);
  });

  it("applies custom className to container", () => {
    const { container } = render(
      <MoodBarRow className="gap-4">
        <MoodBar value={3} max={10} label="A" />
      </MoodBarRow>
    );
    expect(container.firstChild).toBeTruthy();
  });
});

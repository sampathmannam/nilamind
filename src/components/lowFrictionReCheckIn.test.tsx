// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import LowFrictionReCheckIn, { getReCheckInMessage } from "./lowFrictionReCheckIn";

afterEach(cleanup);

describe("LowFrictionReCheckIn", () => {
  it("renders the quick mood buttons", () => {
    render(<LowFrictionReCheckIn onMoodSelect={() => {}} onSkip={() => {}} />);
    expect(screen.getByText("Good")).toBeTruthy();
    expect(screen.getByText("Okay")).toBeTruthy();
    expect(screen.getByText("Low")).toBeTruthy();
    expect(screen.getByText("Struggling")).toBeTruthy();
  });

  it("renders the skip button", () => {
    render(<LowFrictionReCheckIn onMoodSelect={() => {}} onSkip={() => {}} />);
    expect(screen.getByText("Skip for now")).toBeTruthy();
  });

  it("calls onMoodSelect with mood when button clicked", () => {
    const fn = vi.fn();
    render(<LowFrictionReCheckIn onMoodSelect={fn} onSkip={() => {}} />);
    fireEvent.click(screen.getByText("Good"));
    expect(fn).toHaveBeenCalledWith("good");
  });

  it("calls onSkip when skip clicked", () => {
    const fn = vi.fn();
    render(<LowFrictionReCheckIn onMoodSelect={() => {}} onSkip={fn} />);
    fireEvent.click(screen.getByText("Skip for now"));
    expect(fn).toHaveBeenCalled();
  });

  it("shows the header text", () => {
    render(<LowFrictionReCheckIn onMoodSelect={() => {}} onSkip={() => {}} />);
    expect(screen.getByText(/how are you right now/i)).toBeTruthy();
  });
});

describe("getReCheckInMessage", () => {
  it("returns short gap message", () => {
    expect(getReCheckInMessage(2).toLowerCase()).toContain("quick");
  });

  it("returns medium gap message", () => {
    expect(getReCheckInMessage(5).toLowerCase()).toContain("check-in");
  });

  it("returns long gap message", () => {
    expect(getReCheckInMessage(14).toLowerCase()).toContain("understand");
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ProactiveNudgeRail from "./ProactiveNudgeRail";

describe("ProactiveNudgeRail", () => {
  afterEach(() => cleanup());
  it("renders nudge text", () => {
    render(<ProactiveNudgeRail text="Your sleep pattern has shifted" />);
    expect(screen.getByText("Your sleep pattern has shifted")).toBeTruthy();
  });

  it("calls onTap when clicked", () => {
    const onTap = vi.fn();
    render(<ProactiveNudgeRail text="Activity shift" onTap={onTap} />);
    fireEvent.click(screen.getByTestId("proactive-nudge-rail"));
    expect(onTap).toHaveBeenCalled();
  });

  it("calls onTap on Enter key", () => {
    const onTap = vi.fn();
    render(<ProactiveNudgeRail text="Activity shift" onTap={onTap} />);
    fireEvent.keyDown(screen.getByTestId("proactive-nudge-rail"), { key: "Enter" });
    expect(onTap).toHaveBeenCalled();
  });

  it("returns null when text is empty", () => {
    const { container } = render(<ProactiveNudgeRail text="" />);
    expect(container.innerHTML).toBe("");
  });

  it("has data-testid attribute", () => {
    render(<ProactiveNudgeRail text="test" />);
    expect(screen.getByTestId("proactive-nudge-rail")).toBeTruthy();
  });
});

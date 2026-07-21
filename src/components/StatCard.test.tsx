// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("renders value and label", () => {
    render(<StatCard value="7h" label="sleep" />);
    expect(screen.getByText("7h")).toBeTruthy();
    expect(screen.getByText("sleep")).toBeTruthy();
  });

  it("renders icon when provided", () => {
    render(<StatCard value={5} label="check-ins" icon={<span data-testid="icon">📅</span>} />);
    expect(screen.getByTestId("icon")).toBeTruthy();
  });

  it("calls onTap when tapped", () => {
    const handler = vi.fn();
    render(<StatCard value={3} label="days" onTap={handler} />);
    fireEvent.click(screen.getByText("3"));
    expect(handler).toHaveBeenCalled();
  });

  it("does not render sparkline with less than 2 data points", () => {
    const { container } = render(<StatCard value={1} label="x" sparkData={[5]} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders sparkline with 2+ data points", () => {
    const { container } = render(<StatCard value={1} label="x" sparkData={[3, 5, 7]} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

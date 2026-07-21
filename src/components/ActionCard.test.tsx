// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActionCard from "./ActionCard";

describe("ActionCard", () => {
  it("renders title and subtitle", () => {
    render(<ActionCard icon={<span>🌬</span>} title="Breathe" subtitle="Calm your body" onTap={() => {}} />);
    expect(screen.getByText("Breathe")).toBeTruthy();
    expect(screen.getByText("Calm your body")).toBeTruthy();
  });

  it("renders without subtitle", () => {
    render(<ActionCard icon={<span>✓</span>} title="Check in" onTap={() => {}} />);
    expect(screen.getByText("Check in")).toBeTruthy();
  });

  it("calls onTap when tapped", () => {
    const handler = vi.fn();
    render(<ActionCard icon={<span>→</span>} title="Go" onTap={handler} />);
    fireEvent.click(screen.getByText("Go"));
    expect(handler).toHaveBeenCalled();
  });

  it("renders chevron icon", () => {
    const { container } = render(<ActionCard icon={<span>→</span>} title="Navigate" onTap={() => {}} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

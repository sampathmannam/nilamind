// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HeroMetric from "./HeroMetric";

describe("HeroMetric", () => {
  it("renders value and label", () => {
    render(<HeroMetric value={7.2} label="mood score today" />);
    expect(screen.getByText("7.2")).toBeTruthy();
    expect(screen.getByText("mood score today")).toBeTruthy();
  });

  it("renders string values", () => {
    render(<HeroMetric value="N/A" label="sleep" />);
    expect(screen.getByText("N/A")).toBeTruthy();
  });

  it("shows trend arrow up for positive trend", () => {
    const { container } = render(<HeroMetric value={7} label="score" trend={12} />);
    const trendEl = container.querySelector(".text-emerald-400");
    expect(trendEl).toBeTruthy();
    expect(trendEl?.textContent).toContain("12%");
  });

  it("shows trend arrow down for negative trend", () => {
    const { container } = render(<HeroMetric value={5} label="score" trend={-8} />);
    const trendEl = container.querySelector(".text-rose-400");
    expect(trendEl).toBeTruthy();
    expect(trendEl?.textContent).toContain("8%");
  });

  it("shows trend label when provided", () => {
    render(<HeroMetric value={7} label="score" trend={5} trendLabel="from last week" />);
    expect(screen.getByText("from last week")).toBeTruthy();
  });

  it("calls onTap when tapped", () => {
    const handler = vi.fn();
    const { container } = render(<HeroMetric value={7} label="score" onTap={handler} />);
    const btn = container.querySelector("button");
    fireEvent.click(btn!);
    expect(handler).toHaveBeenCalled();
  });

  it("does not render sparkline with less than 2 data points", () => {
    const { container } = render(<HeroMetric value={7} label="score" sparkData={[5]} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders sparkline with 2+ data points", () => {
    const { container } = render(<HeroMetric value={7} label="score" sparkData={[3, 5, 7, 6]} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

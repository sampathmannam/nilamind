// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import InfoCard from "./InfoCard";

describe("InfoCard", () => {
  it("renders title and children", () => {
    render(<InfoCard title="Weekly insight">You checked in 5 days this week.</InfoCard>);
    expect(screen.getByText("Weekly insight")).toBeTruthy();
    expect(screen.getByText("You checked in 5 days this week.")).toBeTruthy();
  });

  it("renders eyebrow when provided", () => {
    render(<InfoCard title="Trends" eyebrow="This week">Content</InfoCard>);
    expect(screen.getByText("This week")).toBeTruthy();
  });

  it("does not render eyebrow when omitted", () => {
    const { container } = render(<InfoCard title="X">Y</InfoCard>);
    expect(container.querySelector(".uppercase")).toBeNull();
  });
});

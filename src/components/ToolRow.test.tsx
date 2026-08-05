// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ToolRow from "./ToolRow";

describe("ToolRow", () => {
  it("renders label and subtitle", () => {
    render(
      <ToolRow
        icon={<span>🌬</span>}
        label="Breathe"
        subtitle="Calm your body"
        onPress={() => {}}
      />,
    );
    expect(screen.getByText("Breathe")).toBeTruthy();
    expect(screen.getByText("Calm your body")).toBeTruthy();
  });

  it("renders without subtitle", () => {
    render(<ToolRow icon={<span>✓</span>} label="Check in" onPress={() => {}} />);
    expect(screen.getByText("Check in")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const handler = vi.fn();
    render(<ToolRow icon={<span>→</span>} label="Go" onPress={handler} />);
    fireEvent.click(screen.getByText("Go"));
    expect(handler).toHaveBeenCalled();
  });

  it("renders chevron icon", () => {
    const { container } = render(
      <ToolRow icon={<span>→</span>} label="Navigate" onPress={() => {}} />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("uses default bg-fill when no accent", () => {
    const { container } = render(
      <ToolRow icon={<span>→</span>} label="Default" onPress={() => {}} />,
    );
    const iconWrap = container.querySelector("[aria-hidden='true']");
    expect(iconWrap?.className).toContain("bg-fill");
  });

  it("applies custom accent bg", () => {
    const { container } = render(
      <ToolRow icon={<span>→</span>} label="Accent" onPress={() => {}} accent="bg-blue-500" />,
    );
    const iconWrap = container.querySelector("[aria-hidden='true']");
    expect(iconWrap?.className).toContain("bg-blue-500");
  });

  it("has min-h-[44px] for tap target", () => {
    const { container } = render(
      <ToolRow icon={<span>→</span>} label="Tap" onPress={() => {}} />,
    );
    const btn = container.querySelector("button");
    expect(btn?.className).toContain("min-h-[44px]");
  });

  it("sets aria-label with subtitle when present", () => {
    render(
      <ToolRow
        icon={<span>🔍</span>}
        label="Search"
        subtitle="Find things"
        onPress={() => {}}
      />,
    );
    expect(screen.getByLabelText("Search: Find things")).toBeTruthy();
  });

  it("sets aria-label without subtitle", () => {
    render(<ToolRow icon={<span>→</span>} label="UniqueLabel" onPress={() => {}} />);
    const btn = screen.getByRole("button", { name: "UniqueLabel" });
    expect(btn).toBeTruthy();
  });
});

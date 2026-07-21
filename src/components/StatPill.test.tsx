// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StatPill, { StatPillRow } from "./StatPill";

describe("StatPill", () => {
  it("renders icon, value, and label", () => {
    render(<StatPill icon="😴" value="7h" label="sleep" />);
    expect(screen.getByText("7h")).toBeTruthy();
    expect(screen.getByText("sleep")).toBeTruthy();
  });

  it("calls onTap when tapped", () => {
    const handler = vi.fn();
    render(<StatPill icon="🧘" value="Yes" label="check-in" onTap={handler} />);
    fireEvent.click(screen.getByLabelText("check-in: Yes"));
    expect(handler).toHaveBeenCalled();
  });
});

describe("StatPillRow", () => {
  it("renders children in a flex row", () => {
    const { container } = render(
      <StatPillRow>
        <StatPill icon="😴" value="7h" label="sleep" />
        <StatPill icon="🧘" value="Yes" label="meditation" />
        <StatPill icon="📊" value="5d" label="streak" />
      </StatPillRow>
    );
    const pills = container.querySelectorAll("button");
    expect(pills.length).toBe(3);
  });
});

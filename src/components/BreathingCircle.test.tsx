// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BreathingCircle from "./BreathingCircle";

describe("BreathingCircle — UX-5 ambient 4-7-8 breathing guide", () => {
  it("renders a decorative, aria-hidden breathing element", () => {
    const { container } = render(<BreathingCircle />);
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.getAttribute("aria-hidden")).toBe("true");
    expect(wrap.querySelector(".breathe-478")).toBeTruthy();
  });

  it("respects a custom size via inline width/height", () => {
    const { container } = render(<BreathingCircle size={120} />);
    const circle = container.querySelector(".breathe-478") as HTMLElement;
    expect(circle.style.width).toBe("120px");
    expect(circle.style.height).toBe("120px");
  });

  it("stays hidden from the accessibility tree even with a label", () => {
    render(<BreathingCircle showLabel />);
    // The label is present in the DOM but the whole widget is aria-hidden, so it won't surface to AT.
    const wrap = screen.getByText("Breathe in… hold… let go").parentElement as HTMLElement;
    expect(wrap.getAttribute("aria-hidden")).toBe("true");
  });
});

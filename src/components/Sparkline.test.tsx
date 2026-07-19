// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import Sparkline from "./Sparkline";

describe("Sparkline", () => {
  it("renders a polyline for >=2 points", () => {
    const { container } = render(<Sparkline data={[3, 5, 4, 6]} />);
    expect(container.querySelector("polyline")).toBeTruthy();
  });

  it("renders nothing for <2 points", () => {
    const { container } = render(<Sparkline data={[5]} />);
    expect(container.querySelector("polyline")).toBeNull();
  });

  it("honors a fixed min/max scale", () => {
    const { container } = render(<Sparkline data={[0, 100]} min={0} max={100} height={100} />);
    const pts = (container.querySelector("polyline") as SVGPolylineElement).getAttribute("points");
    expect(pts).toContain("0,100"); // value 0 -> bottom (y = height)
    expect(pts).toContain(`0,0`); // value 100 -> top (y = 0)
  });
});

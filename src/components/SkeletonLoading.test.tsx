// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import SkeletonCard from "./SkeletonCard";

describe("SkeletonCard", () => {
  it("renders the requested number of shimmer lines and is aria-hidden", () => {
    const { container } = render(<SkeletonCard lines={4} />);
    const card = container.querySelector('[data-testid="skeleton-card"]') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.getAttribute("aria-hidden")).toBe("true");
    expect(card.querySelectorAll(".shimmer").length).toBe(5); // 1 header + 4 lines
  });
});

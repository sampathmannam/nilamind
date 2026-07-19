// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import Card from "./Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card><p>hello</p></Card>);
    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("defaults to glass variant with md padding", () => {
    const { container } = render(<Card>content</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("glass");
    expect(div.className).toContain("p-4");
  });

  it("applies raised variant", () => {
    const { container } = render(<Card variant="raised">content</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("bg-card");
  });

  it("applies accent classes", () => {
    const { container } = render(<Card accent="crisis">content</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("border-l-rose-500");
  });

  it("applies custom className", () => {
    const { container } = render(<Card className="extra">content</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("extra");
  });

  it("passes role and aria-label", () => {
    render(<Card role="region" aria-label="test card">content</Card>);
    expect(screen.getByRole("region")).toBeTruthy();
  });
});

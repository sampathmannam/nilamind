// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import Button from "./Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeTruthy();
  });

  it("applies primary variant classes by default", () => {
    const { container } = render(<Button>primary</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain("bg-accent");
    expect(btn.className).toContain("text-white");
    expect(btn.className).toContain("font-bold");
  });

  it("applies secondary variant classes", () => {
    const { container } = render(<Button variant="secondary">secondary</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain("bg-page");
    expect(btn.className).toContain("border-line");
    expect(btn.className).toContain("text-ink");
  });

  it("applies ghost variant classes", () => {
    const { container } = render(<Button variant="ghost">ghost</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain("bg-transparent");
    expect(btn.className).toContain("text-ink-2");
  });

  it("applies danger variant classes", () => {
    const { container } = render(<Button variant="danger">danger</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain("bg-danger");
    expect(btn.className).toContain("text-white");
  });

  it("applies success variant classes", () => {
    const { container } = render(<Button variant="success">success</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain("bg-success");
    expect(btn.className).toContain("text-ink");
  });

  it("applies warning variant classes", () => {
    const { container } = render(<Button variant="warning">warning</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain("bg-warn");
    expect(btn.className).toContain("text-ink");
  });

  it("applies sm size classes", () => {
    const { container } = render(<Button size="sm">small</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain("text-xs");
    expect(btn.className).toContain("py-2");
    expect(btn.className).toContain("px-3");
  });

  it("applies md size classes by default", () => {
    const { container } = render(<Button>medium</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain("text-sm");
    expect(btn.className).toContain("py-3");
    expect(btn.className).toContain("px-4");
  });

  it("applies lg size classes", () => {
    const { container } = render(<Button size="lg">large</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain("text-base");
    expect(btn.className).toContain("py-3.5");
    expect(btn.className).toContain("px-5");
  });

  it("shows loading spinner when loading", () => {
    const { container } = render(<Button loading>loading</Button>);
    const svg = container.querySelector("svg.animate-spin");
    expect(svg).toBeTruthy();
  });

  it("disables the button when loading", () => {
    const { container } = render(<Button loading>loading</Button>);
    const btn = container.querySelector("button")!;
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("disables the button when disabled prop is true", () => {
    const { container } = render(<Button disabled>disabled</Button>);
    const btn = container.querySelector("button")!;
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("applies disabled opacity class", () => {
    const { container } = render(<Button disabled>disabled</Button>);
    expect((container.firstChild as HTMLElement).className).toContain("opacity-50");
  });

  it("renders icon when provided", () => {
    render(
      <Button icon={<span data-testid="icon">★</span>}>with icon</Button>,
    );
    expect(screen.getByTestId("icon")).toBeTruthy();
  });

  it("does not render icon when loading", () => {
    const { container } = render(
      <Button loading icon={<span data-testid="icon">★</span>}>
        loading
      </Button>,
    );
    expect(container.querySelector("[data-testid='icon']")).toBeNull();
    expect(container.querySelector("svg.animate-spin")).toBeTruthy();
  });

  it("applies fullWidth class", () => {
    const { container } = render(<Button fullWidth>full</Button>);
    expect((container.firstChild as HTMLElement).className).toContain("w-full");
  });

  it("does not apply fullWidth by default", () => {
    const { container } = render(<Button>not full</Button>);
    expect((container.firstChild as HTMLElement).className).not.toContain("w-full");
  });

  it("applies rounded-xl", () => {
    const { container } = render(<Button>rounded</Button>);
    expect((container.firstChild as HTMLElement).className).toContain("rounded-xl");
  });

  it("applies min tap target for accessibility", () => {
    const { container } = render(<Button>a11y</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain("min-w-[44px]");
    expect(btn.className).toContain("min-h-[44px]");
  });

  it("applies custom className", () => {
    const { container } = render(<Button className="custom-class">custom</Button>);
    expect((container.firstChild as HTMLElement).className).toContain("custom-class");
  });

  it("forwards ref", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("passes through button HTML attributes", () => {
    render(<Button type="submit" data-testid="btn">submit</Button>);
    const btn = screen.getByTestId("btn");
    expect(btn.getAttribute("type")).toBe("submit");
  });
});

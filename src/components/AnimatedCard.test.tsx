// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AnimatedCard from "./AnimatedCard";

describe("AnimatedCard — UX-5 staggered entrance", () => {
  it("renders its children", () => {
    render(<AnimatedCard><span>hello band</span></AnimatedCard>);
    expect(screen.getByText("hello band")).toBeTruthy();
  });

  it("applies the fade-up animation class", () => {
    const { container } = render(<AnimatedCard><span>x</span></AnimatedCard>);
    expect(container.firstElementChild?.className).toContain("animate-fade-up");
  });

  it("applies a numeric stagger delay as inline animationDelay", () => {
    const { container } = render(<AnimatedCard delayMs={200}><span>x</span></AnimatedCard>);
    expect((container.firstElementChild as HTMLElement).style.animationDelay).toBe("200ms");
  });

  it("omits the delay style when delayMs is 0", () => {
    const { container } = render(<AnimatedCard delayMs={0}><span>x</span></AnimatedCard>);
    expect((container.firstElementChild as HTMLElement).style.animationDelay).toBe("");
  });

  it("forwards an id and extra className", () => {
    const { container } = render(<AnimatedCard id="band-3" className="mt-2"><span>x</span></AnimatedCard>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.id).toBe("band-3");
    expect(el.className).toContain("mt-2");
  });
});

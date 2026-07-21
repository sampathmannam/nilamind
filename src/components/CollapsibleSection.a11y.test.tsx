// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import CollapsibleSection, { CollapsibleGroup } from "./CollapsibleSection";
import { faceMotion } from "./nilaFaceMotion";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { applyTheme } from "../services/theme";
import { renderHook } from "@testing-library/react";

describe("accessibility — CollapsibleSection is a proper labelled disclosure", () => {
  beforeEach(() => cleanup());
  it("header button exposes aria-expanded + aria-controls + an accessible name", () => {
    render(
      <CollapsibleGroup>
        <CollapsibleSection title="Sleep patterns">
          <p>inside</p>
        </CollapsibleSection>
      </CollapsibleGroup>,
    );
    const btn = screen.getByRole("button", { name: "Sleep patterns" });
    expect(btn).toBeTruthy();
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    const controls = btn.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    const body = document.getElementById(controls!);
    expect(body).toBeTruthy();
  });

  it("when collapsed with a summary, the summary is rendered and referenced via aria-describedby", () => {
    render(
      <CollapsibleGroup>
        <CollapsibleSection title="Mood" summary="How the last two weeks have felt">
          <p>inside</p>
        </CollapsibleSection>
      </CollapsibleGroup>,
    );
    const btn = screen.getByRole("button", { name: /Mood/ });
    const described = btn.getAttribute("aria-describedby");
    expect(described).toBeTruthy();
    const summaryEl = document.getElementById(described!);
    expect(summaryEl?.textContent).toContain("How the last two weeks have felt");
  });

  it("toggles aria-expanded when activated (keyboard/screen-reader operable)", () => {
    render(
      <CollapsibleGroup>
        <CollapsibleSection title="Tools">
          <p>inside</p>
        </CollapsibleSection>
      </CollapsibleGroup>,
    );
    const btn = screen.getByRole("button", { name: "Tools" });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("accessibility — ambient motion respects prefers-reduced-motion", () => {
  it("faceMotion returns a fully still, non-animating state when reduced motion is requested", () => {
    const still = faceMotion("calm", true);
    expect(still.animate).toBe(false);
    expect(still.breatheSec + still.spinSec + still.shimmerSec).toBe(0);
    // Manic-first: reduced motion wins even in an elevated state.
    expect(faceMotion("elevated", true).animate).toBe(false);
  });

  it("faceMotion otherwise animates, and settles (slows) when elevated", () => {
    expect(faceMotion("calm", false).animate).toBe(true);
    expect(faceMotion("elevated", false).breatheSec).toBeGreaterThan(faceMotion("calm", false).breatheSec);
  });

  it("useReducedMotion tracks the media query and updates on change", () => {
    let listener: ((e: { matches: boolean }) => void) | null = null;
    vi.stubGlobal("window", {
      matchMedia: (q: string) => ({
        matches: false,
        media: q,
        addEventListener: (_: string, h: (e: { matches: boolean }) => void) => { listener = h; },
        removeEventListener: () => {},
      }),
    });
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    act(() => { listener?.({ matches: true }); });
    expect(result.current).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe("accessibility — light theme is applied to <html> (WCAG: perceptible, user choice)", () => {
  beforeEach(() => { document.documentElement.classList.remove("theme-light"); });
  afterEach(() => { document.documentElement.classList.remove("theme-light"); });

  it("applyTheme('light') adds the theme-light class; 'dark' removes it", () => {
    applyTheme("light");
    expect(document.documentElement.classList.contains("theme-light")).toBe(true);
    applyTheme("dark");
    expect(document.documentElement.classList.contains("theme-light")).toBe(false);
  });
});

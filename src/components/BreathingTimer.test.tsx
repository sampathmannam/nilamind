// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import BreathingTimer, { sessionTargetReached, SESSION_TARGET_MS } from "./BreathingTimer";

afterEach(cleanup);

describe("BreathingTimer", () => {
  it("renders the pattern picker with cyclic sighing prioritized first and resonance relabeled", () => {
    render(<BreathingTimer />);
    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    // Cyclic sighing is the first (prioritized) pattern option.
    expect(buttons[0]).toBe("Cyclic sighing");
    expect(buttons).toContain("Resonance");
  });

  it("does not show the session-target completion cue before ~5 minutes", () => {
    render(<BreathingTimer />);
    expect(screen.queryByText(/5-minute/i)).toBeNull();
  });
});

describe("BreathingTimer defaultPattern prop (2026-07-12 Wave 3, Group E — TIPP paced-breathing tab)", () => {
  it("defaults to Box when no defaultPattern is given (zero behavior change for existing callers)", () => {
    render(<BreathingTimer />);
    const boxBtn = screen.getByText("Box");
    expect(boxBtn.className).toMatch(/bg-accent\/20/);
  });

  it("opens on the given defaultPattern (e.g. cyclicSighing for TIPP)", () => {
    render(<BreathingTimer defaultPattern="cyclicSighing" />);
    const cyclicBtn = screen.getByText("Cyclic sighing");
    expect(cyclicBtn.className).toMatch(/bg-accent\/20/);
  });
});

describe("sessionTargetReached (~5-minute soft session target, You, Laborde, Zammit, Iskra & Borges et al. 2021)", () => {
  it("is a soft ~5-minute (300000ms) target", () => {
    expect(SESSION_TARGET_MS).toBe(5 * 60 * 1000);
  });
  it("is false before the target and true at/after it", () => {
    expect(sessionTargetReached(0)).toBe(false);
    expect(sessionTargetReached(SESSION_TARGET_MS - 1)).toBe(false);
    expect(sessionTargetReached(SESSION_TARGET_MS)).toBe(true);
    expect(sessionTargetReached(SESSION_TARGET_MS + 1000)).toBe(true);
  });
});

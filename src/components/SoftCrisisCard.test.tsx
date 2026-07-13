// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// Two-tier crisis surface (2026-07-12 Wave 3): SoftCrisisCard is the SOFT tier, shown inline for a
// classifier-only hit — the keyword floor still gets the unchanged full-screen CrisisOverlay. Mirrors
// CrisisOverlay.test.tsx's conventions (audit #27's first component-render test).
vi.mock("../services/secureLocal", () => ({
  secureLocal: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));

import SoftCrisisCard from "./SoftCrisisCard";

afterEach(cleanup);
const noop = () => {};

describe("SoftCrisisCard — soft tier for a classifier-only crisis hit (2026-07-12 Wave 3)", () => {
  it("renders the warm, uncertainty-calibrated copy", () => {
    render(<SoftCrisisCard onEscalate={noop} onDismiss={noop} />);
    expect(screen.getByText(/can i pause here for a second/i)).toBeTruthy();
    expect(screen.getByText(/not fully certain/i)).toBeTruthy();
  });

  it("renders CrisisLines with at least one live line (BlueIce-style low-friction routing)", () => {
    render(<SoftCrisisCard onEscalate={noop} onDismiss={noop} />);
    expect((document.getElementById("crisis-lines")?.children.length ?? 0)).toBeGreaterThan(0);
  });

  it("calls onEscalate when 'I could use support right now' is tapped", () => {
    const onEscalate = vi.fn();
    render(<SoftCrisisCard onEscalate={onEscalate} onDismiss={noop} />);
    fireEvent.click(screen.getByText(/i could use support right now/i));
    expect(onEscalate).toHaveBeenCalledOnce();
  });

  it("calls onDismiss when 'I'm okay, keep going' is tapped", () => {
    const onDismiss = vi.fn();
    render(<SoftCrisisCard onEscalate={noop} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText(/i'm okay, keep going/i));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

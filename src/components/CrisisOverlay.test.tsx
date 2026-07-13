// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// audit #27: the app had NO component render tests — the vitest env was node-only and only *.test.ts. So the
// §9 crisis surface (the most safety-relevant UI) was never mounted/asserted. This is the first render test:
// it mounts the real CrisisOverlay and checks the crisis affordances render and the close/handoff wiring fires.
vi.mock("../services/secureLocal", () => ({
  secureLocal: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));

const offerPostCrisisCheckInMock = vi.fn();
const declinePostCrisisCheckInMock = vi.fn();
vi.mock("../services/postCrisisCheckIn", () => ({
  offerPostCrisisCheckIn: (...args: unknown[]) => offerPostCrisisCheckInMock(...args),
  declinePostCrisisCheckIn: (...args: unknown[]) => declinePostCrisisCheckInMock(...args),
}));

import CrisisOverlay from "./CrisisOverlay";

afterEach(cleanup);
const noop = () => {};

describe("CrisisOverlay — §9 crisis surface renders (audit #27)", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <CrisisOverlay isOpen={false} onClose={noop} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("mounts the crisis dialog with helplines, grounding/breathing shortcuts and the safety plan", () => {
    render(<CrisisOverlay isOpen onClose={noop} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/you reached for this/i)).toBeTruthy();
    // ≥1 crisis line always renders (registry guarantees a non-empty International fallback)
    expect((document.getElementById("crisis-lines")?.children.length ?? 0)).toBeGreaterThan(0);
    expect(document.getElementById("grounding-shortcut-btn")).toBeTruthy();
    expect(document.getElementById("breathing-shortcut-btn")).toBeTruthy();
    expect(screen.getAllByText(/coping plan/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/warning signs i notice/i)).toBeTruthy(); // safety-plan section 1 renders
  });

  it("calls onClose when 'I feel steadier now' is tapped", () => {
    const onClose = vi.fn();
    render(<CrisisOverlay isOpen onClose={onClose} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />);
    fireEvent.click(screen.getByText(/steadier now/i));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("the grounding shortcut both navigates and closes (crisis → grounding handoff)", () => {
    const onClose = vi.fn();
    const onGround = vi.fn();
    render(<CrisisOverlay isOpen onClose={onClose} onNavigateToGrounding={onGround} onNavigateToBreathing={noop} />);
    fireEvent.click(document.getElementById("grounding-shortcut-btn")!);
    expect(onGround).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("CrisisOverlay — opt-in post-crisis check-in (2026-07-12 Wave 3, Task 1.4, never silent)", () => {
  it("does NOT schedule a check-in when the toggle is left unchecked (default, unchecked-by-default)", () => {
    const onClose = vi.fn();
    render(<CrisisOverlay isOpen onClose={onClose} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />);
    fireEvent.click(screen.getByText(/steadier now/i));
    expect(offerPostCrisisCheckInMock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce(); // dismiss still closes immediately — unchanged behavior
  });

  it("schedules the opt-in check-in only when the toggle is explicitly checked before dismissing", () => {
    const onClose = vi.fn();
    render(<CrisisOverlay isOpen onClose={onClose} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />);
    const toggle = document.querySelector<HTMLInputElement>("#post-crisis-checkin-toggle input[type=checkbox]")!;
    fireEvent.click(toggle);
    fireEvent.click(screen.getByText(/steadier now/i));
    expect(offerPostCrisisCheckInMock).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("the toggle is unchecked by default on open", () => {
    render(<CrisisOverlay isOpen onClose={noop} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />);
    const toggle = document.querySelector<HTMLInputElement>("#post-crisis-checkin-toggle input[type=checkbox]")!;
    expect(toggle.checked).toBe(false);
  });
});

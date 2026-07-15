// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// audit #27: the app had NO component render tests — the vitest env was node-only and only *.test.ts. So the
// §9 crisis surface (the most safety-relevant UI) was never mounted/asserted. This is the first render test:
// it mounts the real CrisisOverlay and checks the crisis affordances render and the close/handoff wiring fires.
const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

const offerPostCrisisCheckInMock = vi.fn();
const declinePostCrisisCheckInMock = vi.fn();
vi.mock("../services/postCrisisCheckIn", () => ({
  offerPostCrisisCheckIn: (...args: unknown[]) => offerPostCrisisCheckInMock(...args),
  declinePostCrisisCheckIn: (...args: unknown[]) => declinePostCrisisCheckInMock(...args),
}));

import CrisisOverlay from "./CrisisOverlay";

afterEach(() => { cleanup(); store.clear(); });
const noop = () => {};

describe("CrisisOverlay — §9 crisis surface renders (audit #27)", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <CrisisOverlay isOpen={false} onClose={noop} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("mounts the crisis dialog with helplines, grounding/breathing shortcuts, and filled safety-plan sections", () => {
    store.set(
      "nilamind_safetyplan",
      JSON.stringify({
        warningSigns: "not sleeping, going quiet",
        internalCoping: "cold water on my face",
        socialDistractors: "",
        trustedPeople: "",
        professionals: "",
        safeEnvironment: "",
      }),
    );
    render(<CrisisOverlay isOpen onClose={noop} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/you reached for this/i)).toBeTruthy();
    // ≥1 crisis line always renders (registry guarantees a non-empty International fallback)
    expect((document.getElementById("crisis-lines")?.children.length ?? 0)).toBeGreaterThan(0);
    expect(document.getElementById("grounding-shortcut-btn")).toBeTruthy();
    expect(document.getElementById("breathing-shortcut-btn")).toBeTruthy();
    expect(screen.getAllByText(/coping plan/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/warning signs i notice/i)).toBeTruthy(); // filled section 1 renders
  });

  it("declutters: a fully blank plan shows an invitation instead of six empty placeholder sections", () => {
    render(<CrisisOverlay isOpen onClose={noop} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />);
    expect(screen.queryByText(/warning signs i notice/i)).toBeNull();
    expect(screen.queryByText(/things i can do on my own to cope/i)).toBeNull();
    expect(screen.getByText(/haven't built a coping plan yet/i)).toBeTruthy();
  });

  it("declutters: only filled sections render when the plan is partially filled", () => {
    store.set(
      "nilamind_safetyplan",
      JSON.stringify({
        warningSigns: "not sleeping",
        internalCoping: "",
        socialDistractors: "",
        trustedPeople: "",
        professionals: "",
        safeEnvironment: "",
      }),
    );
    render(<CrisisOverlay isOpen onClose={noop} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />);
    expect(screen.getByText(/warning signs i notice/i)).toBeTruthy();
    expect(screen.queryByText(/things i can do on my own to cope/i)).toBeNull();
  });

  it("renders the Ride the Wave de-escalation content", () => {
    render(<CrisisOverlay isOpen onClose={noop} onNavigateToGrounding={noop} onNavigateToBreathing={noop} />);
    expect(document.getElementById("ride-the-wave-card")).toBeTruthy();
  });

  it("calls onBuildPlanLater from the blank-plan invitation when provided", () => {
    const onBuildPlanLater = vi.fn();
    render(
      <CrisisOverlay
        isOpen
        onClose={noop}
        onNavigateToGrounding={noop}
        onNavigateToBreathing={noop}
        onBuildPlanLater={onBuildPlanLater}
      />,
    );
    fireEvent.click(document.getElementById("crisis-build-plan-later-btn")!);
    expect(onBuildPlanLater).toHaveBeenCalledOnce();
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

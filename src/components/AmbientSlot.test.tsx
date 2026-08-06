// @vitest-environment jsdom
// Redesign §5.1: the ambient slot is the ONLY place a prompt card may appear on Home, capped at 1.
// Priority: safety-plan followup > review > sleep > rating. Crisis suppression blanks everything.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

const signals = {
  safetyPlanCard: null as "review" | "followup" | null,
  sleepNudge: null as { firing: boolean; detail: string } | null,
  suppressed: false,
  completeReview: vi.fn(),
  completeFollowUp: vi.fn(),
  hideSafetyPlanCard: vi.fn(),
  dismissSleep: vi.fn(),
};
vi.mock("../hooks/useAmbientSignals", () => ({ useAmbientSignals: () => signals }));
vi.mock("../services/ratingPrompt", () => ({
  shouldPromptRating: () => true,
  dismissRatingPrompt: vi.fn(),
  onUserRated: vi.fn(),
}));

import AmbientSlot from "./AmbientSlot";

afterEach(() => {
  cleanup();
  signals.safetyPlanCard = null;
  signals.sleepNudge = null;
  signals.suppressed = false;
});

describe("AmbientSlot — one bounded card", () => {
  it("renders only the highest-priority card (followup beats sleep + rating)", () => {
    signals.safetyPlanCard = "followup";
    signals.sleepNudge = { firing: true, detail: "short sleep 3 nights" };
    render(<AmbientSlot go={() => {}} />);
    expect(document.getElementById("safety-plan-followup-card")).toBeTruthy();
    expect(document.getElementById("sleep-prodrome-card")).toBeNull();
    expect(document.getElementById("rating-prompt-card")).toBeNull();
  });

  it("review card shows when no followup is due", () => {
    signals.safetyPlanCard = "review";
    render(<AmbientSlot go={() => {}} />);
    expect(document.getElementById("safety-plan-review-card")).toBeTruthy();
    expect(document.getElementById("rating-prompt-card")).toBeNull();
  });

  it("sleep card shows when it fires and no safety-plan card is due", () => {
    signals.sleepNudge = { firing: true, detail: "short sleep 3 nights" };
    render(<AmbientSlot go={() => {}} />);
    expect(document.getElementById("sleep-prodrome-card")).toBeTruthy();
    expect(document.getElementById("rating-prompt-card")).toBeNull();
  });

  it("a non-firing sleep signal does not occupy the slot", () => {
    signals.sleepNudge = { firing: false, detail: "" };
    render(<AmbientSlot go={() => {}} />);
    expect(document.getElementById("sleep-prodrome-card")).toBeNull();
    expect(document.getElementById("rating-prompt-card")).toBeTruthy();
  });

  it("falls through to the rating prompt when nothing else fires", () => {
    render(<AmbientSlot go={() => {}} />);
    expect(document.getElementById("rating-prompt-card")).toBeTruthy();
  });

  it("renders nothing while crisis suppression is latched (§9)", () => {
    signals.safetyPlanCard = "review";
    signals.sleepNudge = { firing: true, detail: "x" };
    signals.suppressed = true;
    const { container } = render(<AmbientSlot go={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("opening the plan from the card hides it and routes to safety_plan", () => {
    signals.safetyPlanCard = "followup";
    const go = vi.fn();
    render(<AmbientSlot go={go} />);
    (document.querySelector("#safety-plan-followup-card button") as HTMLButtonElement).click();
    expect(signals.hideSafetyPlanCard).toHaveBeenCalledOnce();
    expect(go).toHaveBeenCalledWith("safety_plan");
  });
});

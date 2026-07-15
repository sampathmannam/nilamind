// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import SafetyPlanNudgeCard from "./SafetyPlanNudgeCard";

afterEach(() => {
  cleanup();
  store.clear();
});

describe("SafetyPlanNudgeCard — the create-nudge that doesn't exist today", () => {
  it("renders when the plan has no meaningful content", () => {
    render(<SafetyPlanNudgeCard go={() => {}} />);
    expect(screen.getByText(/haven't set up a coping plan/i)).toBeTruthy();
  });

  it("does not render once the plan has real content", () => {
    store.set(
      "nilamind_safetyplan",
      JSON.stringify({
        warningSigns: "not sleeping, going quiet",
        internalCoping: "",
        socialDistractors: "",
        trustedPeople: "",
        professionals: "",
        safeEnvironment: "",
      }),
    );
    render(<SafetyPlanNudgeCard go={() => {}} />);
    expect(screen.queryByText(/haven't set up a coping plan/i)).toBeNull();
  });

  it("tapping 'Set it up' navigates to the safety plan and hides the card", () => {
    const go = vi.fn();
    render(<SafetyPlanNudgeCard go={go} />);
    fireEvent.click(document.getElementById("safety-plan-nudge-open-btn")!);
    expect(go).toHaveBeenCalledWith("safety_plan");
    expect(screen.queryByText(/haven't set up a coping plan/i)).toBeNull();
  });

  it("dismissing hides the card", () => {
    render(<SafetyPlanNudgeCard go={() => {}} />);
    fireEvent.click(screen.getByLabelText(/dismiss/i));
    expect(screen.queryByText(/haven't set up a coping plan/i)).toBeNull();
  });
});

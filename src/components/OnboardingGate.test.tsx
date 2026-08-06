// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// engagement-onboarding synthesis: the "how Nila helps" slide should carry a brief expectancy/rationale
// sentence (Devilly & Borkovec 2000; Abd-Alrazaq et al. 2020; Sohn, Ha, Park et al. 2026) — credibility/
// expectancy predicts subsequent SYMPTOM outcome, not adherence. The synthesis explicitly found an earlier
// "~0.35 adherence correlation" claim unsupported and removed it, so this must never resurface a number or
// an adherence/retention claim, and must stay hedged ("may help" / "linked to", not "proven"/"treats").
const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: { requestPermissions: () => Promise.resolve({ display: "granted" }) },
}));

import OnboardingGate from "./OnboardingGate";

afterEach(() => { cleanup(); store.clear(); });
const noop = () => {};

function goToHowNilaHelpsSlide() {
  render(<OnboardingGate onComplete={noop} onOpenCrisis={noop} />);
  // nila_intro -> privacy -> mood_check -> goals -> region -> how_nila_helps (5 "Next" taps)
  fireEvent.click(screen.getByText(/next/i));
  fireEvent.click(screen.getByText(/next/i));
  fireEvent.click(screen.getByText(/next/i));
  fireEvent.click(screen.getByText(/next/i));
  fireEvent.click(screen.getByText(/next/i));
}

describe("OnboardingGate — how Nila helps slide (expectancy-setting copy)", () => {
  it("shows a brief rationale/expectancy sentence on the how-Nila-helps slide", () => {
    goToHowNilaHelpsSlide();
    expect(screen.getByText(/how nila helps/i)).toBeTruthy();
    const bodyText = document.getElementById("onboarding-gate")?.textContent ?? "";
    expect(bodyText.toLowerCase()).toContain("listen");
    expect(bodyText.toLowerCase()).toContain("companion");
  });

  it("never states a numeric adherence-correlation figure (found unsupported, removed by the synthesis)", () => {
    goToHowNilaHelpsSlide();
    const bodyText = document.getElementById("onboarding-gate")?.textContent ?? "";
    expect(bodyText).not.toMatch(/0\.\d+\s*correlat/i);
    expect(bodyText).not.toMatch(/r\s*=\s*0\.\d+/i);
  });

  it("does not overclaim clinical efficacy ('proven'/'treats'/'cures')", () => {
    goToHowNilaHelpsSlide();
    const bodyText = document.getElementById("onboarding-gate")?.textContent ?? "";
    expect(bodyText).not.toMatch(/\bproven\b|\btreats\b|\bcures\b/i);
  });
});

describe("OnboardingGate — simplified flow", () => {
  it("completes onboarding with default notification settings", () => {
    render(<OnboardingGate onComplete={noop} onOpenCrisis={noop} />);
    // nila_intro -> privacy -> mood_check -> goals -> region -> how_nila_helps -> ready (6 "Next" taps)
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByRole("button", { name: /start/i })); // finish()
    // Default: daily nudge enabled, no safety plan written
    expect(store.get("nilamind_safetyplan")).toBeUndefined();
  });

  it("saves mood baseline when selected", () => {
    render(<OnboardingGate onComplete={noop} onOpenCrisis={noop} />);
    fireEvent.click(screen.getByText(/next/i)); // -> privacy
    fireEvent.click(screen.getByText(/next/i)); // -> mood_check
    // Select a mood
    const moodButton = screen.getByText("😊");
    fireEvent.click(moodButton);
    fireEvent.click(screen.getByText(/next/i)); // -> goals
    fireEvent.click(screen.getByText(/next/i)); // -> region
    fireEvent.click(screen.getByText(/next/i)); // -> how_nila_helps
    fireEvent.click(screen.getByText(/next/i)); // -> ready
    fireEvent.click(screen.getByRole("button", { name: /start/i })); // finish()
    expect(store.get("nilamind_onboarding_mood")).toBeTruthy();
  });

  it("saves goals when selected", () => {
    render(<OnboardingGate onComplete={noop} onOpenCrisis={noop} />);
    fireEvent.click(screen.getByText(/next/i)); // -> privacy
    fireEvent.click(screen.getByText(/next/i)); // -> mood_check
    fireEvent.click(screen.getByText(/next/i)); // -> goals
    // Select goals
    fireEvent.click(screen.getByText("Sleep"));
    fireEvent.click(screen.getByText("Mood"));
    fireEvent.click(screen.getByText(/next/i)); // -> region
    fireEvent.click(screen.getByText(/next/i)); // -> how_nila_helps
    fireEvent.click(screen.getByText(/next/i)); // -> ready
    fireEvent.click(screen.getByRole("button", { name: /start/i })); // finish()
    const goals = JSON.parse(store.get("nilamind_user_goal") ?? "[]");
    expect(goals).toContain("sleep");
    expect(goals).toContain("mood");
  });
});

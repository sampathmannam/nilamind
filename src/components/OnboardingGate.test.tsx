// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// engagement-onboarding synthesis: the "how Nila helps" slide should carry a brief expectancy/rationale
// sentence (Devilly & Borkovec 2000; Abd-Alrazaq et al. 2020; Sohn, Ha, Park et al. 2026) — credibility/
// expectancy predicts subsequent SYMPTOM outcome, not adherence. The synthesis explicitly found an earlier
// "~0.35 adherence correlation" claim unsupported and removed it, so this must never resurface a number or
// an adherence/retention claim, and must stay hedged ("may help" / "linked to", not "proven"/"treats").
vi.mock("../services/secureLocal", () => ({
  secureLocal: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));

import OnboardingGate from "./OnboardingGate";

afterEach(cleanup);
const noop = () => {};

function goToHowNilaHelpsSlide() {
  render(<OnboardingGate onComplete={noop} onOpenCrisis={noop} />);
  // nila_intro -> privacy -> mood_check -> personalize -> region -> nudge_cadence -> how_nila_helps (6 "Next" taps)
  fireEvent.click(screen.getByText(/next/i));
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
    // A rationale sentence beyond the pre-existing body copy — look for expectancy-flavored language.
    expect(screen.getByText(/why|expect|linked to|may help/i)).toBeTruthy();
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

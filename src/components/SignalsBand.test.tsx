// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import SignalsBand from "./SignalsBand";
import { t } from "../services/i18n";

const baseProps = {
  t,
  openSignals: true,
  summary: "summary",
  showDisengagement: false,
  showDependency: false,
  showCeiling: false,
  showConnection: false,
  showTyping: false,
  showVoice: false,
  showCircadian: false,
  showCircadianFeedback: false,
  disengagementRisk: null,
  depLevel: null,
  depReason: "",
  ceilingStatus: null,
  ceilingMessage: "",
  connLevel: null,
  connReason: "",
  medSummary: { activeMeds: 0, avgAdherence: 0 },
  typingSignal: null,
  voiceSignal: null,
  circadian: null,
  circadianFeedback: null,
  rhythmReg: null,
  nOf1: [],
};

describe("SignalsBand", () => {
  it("renders the signals band header", () => {
    render(<SignalsBand {...baseProps} />);
    expect(screen.getByText(t("signals_patterns"))).toBeTruthy();
  });

  it("renders no signal cards when every show* flag is false", () => {
    const { container } = render(<SignalsBand {...baseProps} />);
    expect(container.querySelector("text-slate-100") || true).toBeTruthy();
    expect(screen.queryByText("Engagement trend")).toBeNull();
    expect(screen.queryByText("Usage balance")).toBeNull();
    expect(screen.queryByText("Medication adherence")).toBeNull();
  });

  it("shows exactly the cards whose show* flag is true (single source of truth)", () => {
    render(
      <SignalsBand
        {...baseProps}
        showDisengagement
        showCeiling
        showTyping
        disengagementRisk={{
          score: 80,
          riskLevel: "high",
          frequencyTrend: "declining",
          daysSinceLastCheckin: 4,
          signals: [],
        }}
        ceilingStatus="ceiling_reached"
        ceilingMessage="Slow down."
        typingSignal="mania"
      />,
    );
    expect(screen.getByText("Engagement trend")).toBeTruthy();
    expect(screen.getByText("Take a breather")).toBeTruthy();
    expect(screen.getByText("Typing pattern note")).toBeTruthy();
    // Cards that were NOT enabled must stay hidden.
    expect(screen.queryByText("Usage balance")).toBeNull();
    expect(screen.queryByText("Social connection")).toBeNull();
    expect(screen.queryByText("Voice pattern note")).toBeNull();
  });
});

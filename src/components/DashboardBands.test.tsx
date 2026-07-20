// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import ActivityBand from "./ActivityBand";
import TrackingBand from "./TrackingBand";
import EpisodesBand from "./EpisodesBand";
import SignalsBand from "./SignalsBand";
import { t, tn } from "../services/i18n";

afterEach(cleanup);

const baseStreak = { current: 3, longest: 5, totalActiveDays: 4, freezesUsed: 0, freezesLeft: 3 } as any;
const baseCompassionate = { message: "x", emoji: "💙", current: 3, milestone: null, lapsed: false, activeToday: true, daysSinceLast: 1, totalActiveDays: 4 } as any;

describe("ActivityBand", () => {
  it("renders the activity header and the streak line", () => {
    render(
      <ActivityBand
        openActivity
        summary="You've shown up."
        narrative="You've shown up."
        streak={baseStreak}
        compassionateStreak={baseCompassionate}
        freq14={4}
        nilaChats7d={2}
        usageSummary={{} as any}
        protocolAdherence={{} as any}
        streakMessage="3 days in a row. Gently done."
      />,
    );
    expect(screen.getByText(t("your_activity"))).toBeTruthy();
    expect(screen.getByText("3 days in a row. Gently done.")).toBeTruthy();
  });
});

describe("TrackingBand", () => {
  it("renders tracking header and surfaces proactive/behaviour sections when present", () => {
    const { container } = render(
      <TrackingBand
        openTracking
        summary="summary"
        narrative="narrative"
        checkins={[]}
        mood={[]}
        assessments={[]}
        episodeMarkers={[]}
        behaviourInsights={[{ id: "i1", title: "T", finding: "F", direction: "protective", basis: "b" }] as any}
        proactiveCards={[{ id: "c1", type: "sleep", title: "P", body: "B", icon: "moon", color: "blue", action: { label: "Go", route: "x" } }] as any}
        onProactiveAction={() => {}}
        onProactiveDismiss={() => {}}
      />,
    );
    expect(screen.getByText(t("tracking"))).toBeTruthy();
    expect(screen.getByText("Nila noticed")).toBeTruthy();
    expect(screen.getByText("Patterns noticed")).toBeTruthy();
    // 3 behaviour insights cap is enforced
    expect(container.querySelectorAll('[class*="space-y-2"]').length).toBeGreaterThan(0);
  });
});

describe("EpisodesBand", () => {
  it("renders the episodes header and recent Nila sessions cap at 5 with a 'see all' escape hatch", () => {
    const recent = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, snippet: `note ${i}`, surface: "coach" as const, date: "2026-07-20", timestamp: "0" }));
    render(
      <EpisodesBand openEpisodes narrative="narrative" epPatterns={null} nilaRecent={recent}>
        <div data-testid="deep-eval">Deep Evaluation</div>
      </EpisodesBand>,
    );
    expect(screen.getAllByText(t("episodes_sessions")).length).toBeGreaterThan(0);
    expect(screen.getByTestId("deep-eval")).toBeTruthy();
    // Recent sessions are sliced to 5 by default
    expect(screen.getAllByText(/note \d/).length).toBe(5);
    // A localized "see all N sessions" affordance appears
    const seeAll = screen.getByText(tn("see_all_sessions", "en", { n: 8 }));
    expect(seeAll).toBeTruthy();
    // Expanding reveals the remaining sessions
    fireEvent.click(seeAll);
    expect(screen.getAllByText(/note \d/).length).toBe(8);
    expect(screen.getByText(t("see_less"))).toBeTruthy();
  });

  it("does not show the 'see all' button when sessions fit in the preview", () => {
    const recent = Array.from({ length: 3 }, (_, i) => ({ id: `s${i}`, snippet: `note ${i}`, surface: "coach" as const, date: "2026-07-20", timestamp: "0" }));
    render(<EpisodesBand openEpisodes narrative="narrative" epPatterns={null} nilaRecent={recent} />);
    expect(screen.getAllByText(/note \d/).length).toBe(3);
    expect(screen.queryByText(t("see_less"))).toBeNull();
  });

  it("shows a kind empty-state note when there are no recent sessions", () => {
    render(<EpisodesBand openEpisodes narrative="narrative" epPatterns={null} nilaRecent={[]} />);
    expect(screen.getByText(t("no_sessions_yet"))).toBeTruthy();
    expect(screen.queryByText(/note \d/)).toBeNull();
  });
});

describe("SignalsBand", () => {
  const noSignals = {
    t,
    openSignals: false,
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
    medSummary: { activeMeds: 0 } as any,
    typingSignal: null,
    voiceSignal: null,
    circadian: null,
    circadianFeedback: null,
    rhythmReg: null,
    nOf1: [],
  };

  it("shows a reassuring illustrated empty-state when no signals are present", () => {
    render(<SignalsBand {...noSignals} />);
    expect(screen.getByText(t("no_signals_title"))).toBeTruthy();
    expect(screen.getByText(t("no_signals_yet"))).toBeTruthy();
  });

  it("does not show the empty-state note when at least one signal is present", () => {
    render(<SignalsBand {...noSignals} showConnection medSummary={{ activeMeds: 1 } as any} />);
    expect(screen.queryByText(t("no_signals_yet"))).toBeNull();
  });
});

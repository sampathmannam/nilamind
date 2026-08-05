// @vitest-environment jsdom
/**
 * Regression coverage for the 2026-08-04 audit fixes (TodayWidgets.tsx had ZERO test coverage before
 * this — part of why these dead-button bugs shipped and went unnoticed on a real device):
 *   - MoodTrendWidget / NextProtocolWidget / RhythmWidget / AssessmentWidget were all styled as tappable
 *     buttons (hover/active/chevron affordance) but had NO onClick handler at all.
 *   - SleepWidget's empty state had an explicit `onClick={() => {}}` no-op.
 *   - NextProtocolWidget's empty state duplicated TodayScreen's own always-visible "Guided Programs"
 *     hero card verbatim — confirmed rendering simultaneously on-device. Now suppressed (returns null).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("../services/checkin", () => ({ loadCheckins: vi.fn() }));
vi.mock("../services/protocolProgress", () => ({ getActiveProgress: vi.fn() }));
vi.mock("../services/protocols", () => ({ getProtocol: vi.fn() }));
vi.mock("../services/socialRhythm", () => ({ hasRhythmToday: vi.fn(), loadTodayAnchors: vi.fn() }));
vi.mock("../services/assessments", () => ({
  loadAssessments: vi.fn(() => []),
  INSTRUMENTS: { "WHO-5": { measures: "Wellbeing" }, "PHQ-9": { measures: "Depression" } },
}));
vi.mock("../services/wellbeingTrack", () => ({ isWellbeingDue: vi.fn(), wellbeingCadence: vi.fn(() => ({ daysSinceLast: null })) }));
vi.mock("../services/assessmentPrompts", () => ({ getTopAssessmentPrompt: vi.fn(() => null) }));
vi.mock("../services/sleepLog", () => ({ getSleepLog: vi.fn(() => []) }));
vi.mock("../services/sleepInsight", () => ({ selfReportedSleepNights: vi.fn(() => []) }));
vi.mock("../services/nilaInsights", () => ({ loadInsights: vi.fn(() => []) }));
vi.mock("../services/streaks", () => ({ computeCompassionateStreak: vi.fn(() => ({ current: 0, longest: 0 })) }));

import { loadCheckins } from "../services/checkin";
import { getActiveProgress } from "../services/protocolProgress";
import { getProtocol } from "../services/protocols";
import { hasRhythmToday, loadTodayAnchors } from "../services/socialRhythm";
import { loadAssessments, INSTRUMENTS } from "../services/assessments";
import { isWellbeingDue } from "../services/wellbeingTrack";
import { MoodTrendWidget, NextProtocolWidget, RhythmWidget, AssessmentWidget, SleepWidget } from "./TodayWidgets";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("MoodTrendWidget — wired to go()", () => {
  it("empty state (< 2 check-ins) routes to ema_checkin on tap", () => {
    (loadCheckins as ReturnType<typeof vi.fn>).mockReturnValue([]);
    const go = vi.fn();
    render(<MoodTrendWidget go={go} />);
    fireEvent.click(screen.getByText("Mood Trend"));
    expect(go).toHaveBeenCalledWith("ema_checkin");
  });

  it("populated state routes to diary on tap", () => {
    (loadCheckins as ReturnType<typeof vi.fn>).mockReturnValue([
      { date: "2026-08-01", intensity: 5, emotion: "okay" },
      { date: "2026-08-02", intensity: 7, emotion: "good" },
    ]);
    const go = vi.fn();
    render(<MoodTrendWidget go={go} />);
    fireEvent.click(screen.getByText("Mood Trend"));
    expect(go).toHaveBeenCalledWith("diary");
  });

  it("does not throw when go is omitted (optional prop)", () => {
    (loadCheckins as ReturnType<typeof vi.fn>).mockReturnValue([]);
    render(<MoodTrendWidget />);
    expect(() => fireEvent.click(screen.getByText("Mood Trend"))).not.toThrow();
  });
});

describe("NextProtocolWidget — empty state suppressed, populated state wired", () => {
  it("renders NOTHING when there is no active protocol (was: duplicate 'Guided Programs' card)", () => {
    (getActiveProgress as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const { container } = render(<NextProtocolWidget go={vi.fn()} />);
    expect(container.textContent).toBe("");
  });

  it("populated state routes to guided_programs on tap", () => {
    (getActiveProgress as ReturnType<typeof vi.fn>).mockReturnValue({
      protocol: { id: "behavioral-activation" }, stepIndex: 2, total: 7,
      step: { prompt: "Notice one small win today" },
    });
    (getProtocol as ReturnType<typeof vi.fn>).mockReturnValue({ id: "behavioral-activation", title: "Behavioral Activation" });
    const go = vi.fn();
    render(<NextProtocolWidget go={go} />);
    expect(screen.getByText("Step 3 of 7")).toBeTruthy();
    fireEvent.click(screen.getByText("Behavioral Activation"));
    expect(go).toHaveBeenCalledWith("guided_programs");
  });
});

describe("RhythmWidget — wired to go('social_rhythm')", () => {
  it("empty state routes to social_rhythm on tap", () => {
    (hasRhythmToday as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const go = vi.fn();
    render(<RhythmWidget go={go} />);
    fireEvent.click(screen.getByText("Daily Rhythm"));
    expect(go).toHaveBeenCalledWith("social_rhythm");
  });

  it("populated state routes to social_rhythm on tap", () => {
    (hasRhythmToday as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (loadTodayAnchors as ReturnType<typeof vi.fn>).mockReturnValue({ wake: "07:00", bed: "23:00" });
    const go = vi.fn();
    render(<RhythmWidget go={go} />);
    fireEvent.click(screen.getByText("Daily Rhythm"));
    expect(go).toHaveBeenCalledWith("social_rhythm");
  });
});

describe("AssessmentWidget — wired to go('assessment')", () => {
  it("routes to assessment on tap when due", () => {
    (isWellbeingDue as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (loadAssessments as ReturnType<typeof vi.fn>).mockReturnValue([]);
    const go = vi.fn();
    render(<AssessmentWidget go={go} />);
    fireEvent.click(screen.getByText("Wellbeing Check"));
    expect(go).toHaveBeenCalledWith("assessment");
  });
});

describe("SleepWidget — empty state is honest about having no logging destination", () => {
  it("renders the empty state as non-interactive (no button role, no fake onClick)", () => {
    render(<SleepWidget />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("No sleep logged yet")).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

const store = new Map<string, string>();
vi.mock("../services/secureLocal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/secureLocal")>();
  return {
    ...actual,
    secureLocal: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  };
});
vi.mock("../hooks/useHaptics", () => ({ hapticMedium: vi.fn() }));

import TodayScreen, { getHeroAction } from "./TodayScreen";
import { personalizeToolOrder, personalizeToolByContext } from "./toolsRows";
import { buildToolGroups, type ToolGroup } from "./toolsRows";

afterEach(() => { cleanup(); store.clear(); });

// The onboarding goal picker (`nilamind_user_goal`) was write-only (audit finding, engagement-onboarding
// synthesis). personalizeToolOrder() is the pure reordering step TodayScreen applies to buildToolGroups()'s
// output before rendering the "All tools" list, so the stated goal actually surfaces relevant tools first —
// a named engagement facilitator, per Borghouts, Eikey, Mark et al. (2021), J Med Internet Res.
const STUB = { go: () => {}, onEpisode: () => {}, phoneEnabled: false };
const rowIds = (groups: ToolGroup[]) => groups.flatMap((g) => g.rows.map((r) => r.id));

describe("personalizeToolOrder", () => {
  it("leaves row order and group membership unchanged when there are no goals", () => {
    const groups = buildToolGroups(STUB);
    const result = personalizeToolOrder(groups, []);
    expect(rowIds(result)).toEqual(rowIds(groups));
    expect(result.map((g) => g.title)).toEqual(groups.map((g) => g.title));
  });

  it("leaves order unchanged for a goal with no mapped priority tools (Just curious)", () => {
    const groups = buildToolGroups(STUB);
    const result = personalizeToolOrder(groups, ["Just curious"]);
    expect(rowIds(result)).toEqual(rowIds(groups));
  });

  it("promotes grounding tools to the front of their group for the 'grounding' goal", () => {
    const groups = buildToolGroups(STUB);
    const result = personalizeToolOrder(groups, ["grounding"]);
    const inTheMoment = result.find((g) => g.title === "In the moment")!;
    expect(inTheMoment.rows[0].id).toBe("plan");
  });

  it("promotes mood-tracking tools to the front for the 'mood' goal", () => {
    const groups = buildToolGroups(STUB);
    const result = personalizeToolOrder(groups, ["mood"]);
    const logTrack = result.find((g) => g.title === "Log & track")!;
    expect(logTrack.rows[0].id).toBe("ema_checkin");
  });

  it("does not drop or duplicate any row when reordering", () => {
    const groups = buildToolGroups(STUB);
    const result = personalizeToolOrder(groups, ["grounding", "mood"]);
    expect(rowIds(result).sort()).toEqual(rowIds(groups).sort());
  });
});

describe("personalizeToolByContext — UX-3 time/state-aware tool ordering", () => {
  it("is a no-op for daytime with no state", () => {
    const groups = buildToolGroups(STUB);
    expect(personalizeToolByContext(groups, { timeMode: "day", state: null })).toBe(groups);
  });
  it("promotes wind-down and grounding in the evening", () => {
    const groups = buildToolGroups(STUB);
    const result = personalizeToolByContext(groups, { timeMode: "evening", state: null });
    const moment = result.find((g) => g.title === "In the moment")!;
    expect(moment.rows[0].id).toBe("winddown");
  });
  it("promotes grounding (plan) when anxious", () => {
    const groups = buildToolGroups(STUB);
    const result = personalizeToolByContext(groups, { timeMode: "day", state: "anxious" });
    const moment = result.find((g) => g.title === "In the moment")!;
    expect(moment.rows[0].id).toBe("plan");
  });
  it("promotes crisis support first when in crisis", () => {
    const groups = buildToolGroups(STUB);
    const result = personalizeToolByContext(groups, { timeMode: "day", state: "crisis" });
    const moment = result.find((g) => g.title === "In the moment")!;
    expect(moment.rows[0].id).toBe("episode");
  });
  it("does not drop or duplicate any row", () => {
    const groups = buildToolGroups(STUB);
    const result = personalizeToolByContext(groups, { timeMode: "night", state: "elevated" });
    expect(rowIds(result).sort()).toEqual(rowIds(groups).sort());
  });
});

// Design intent (U1.2, 2026-07-21): the standalone "Talk to Nila" card was removed as a duplicate
// — the hero action already handles Nila navigation when intention is set, so the card was adding
// visual noise. The primary Nila entry point is the tab bar; Today's hero surfaces the most
// contextually-relevant action. Tests updated to reflect this.
describe("getHeroAction — structured-tool-first rebalance", () => {
  // getHeroAction reads the real wall-clock hour for its night branch (pre-existing behavior,
  // independent of the timeMode/first param) — pin the clock to a stable daytime hour so these
  // assertions aren't flaky depending on when the suite runs.
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-07-12T10:00:00")); });
  afterEach(() => { vi.useRealTimers(); });

  it("still leads with wind-down at night regardless of daily-intention state", () => {
    vi.setSystemTime(new Date("2026-07-12T23:00:00"));
    expect(getHeroAction("night", "calm", false).id).toBe("winddown");
    expect(getHeroAction("night", "calm", true).id).toBe("winddown");
  });

  it("still leads with grounding when anxious/elevated regardless of daily-intention state", () => {
    expect(getHeroAction("day", "anxious", false).id).toBe("plan");
    expect(getHeroAction("day", "elevated", true).id).toBe("plan");
  });

  it("leads with the daily-intention prompt when no daily intention is set yet", () => {
    const hero = getHeroAction("morning", "calm", false);
    expect(hero.id).toBe("daily_intention");
    expect(hero.label.toLowerCase()).toContain("intention");
  });

  it("falls back to Talk to Nila once today's intention has been set (avoids duplicating the mood check-in card)", () => {
    const hero = getHeroAction("morning", "calm", true);
    expect(hero.id).toBe("nila");
  });
});

describe("TodayScreen — structured-tool lead, phase-aware rendering", () => {
  const noop = () => {};
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-07-21T10:00:00")); });
  afterEach(() => { vi.useRealTimers(); });

  it("shows intention-set hero when daily intention has not been set", () => {
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    expect(screen.getByText(/Set today's intention/)).toBeTruthy();
  });

  it("daily-intention card renders below the hero", () => {
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    const intentionCard = document.getElementById("today-daily-intention");
    expect(intentionCard).toBeTruthy();
  });

  it("keeps chat reachable via the tab bar — no standalone Talk to Nila card on Today", () => {
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    expect(screen.queryAllByText(/Talk to Nila/).length).toBe(0);
  });

  it("hero navigates to nila when daily intention is already set", () => {
    // DailyIntention requires `if` + `then` + `date` fields
    store.set("nilamind_daily_intention", JSON.stringify({ if: "test cue", then: "test action", date: "2026-07-21" }));
    store.set("nilamind_checkins", JSON.stringify([{ date: "2026-07-20", emotion: "okay", intensity: 5 }]));
    const go = vi.fn();
    render(<TodayScreen go={go} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    // The hero button has a gradient bg class. Find it and verify the label
    const btns = screen.getAllByRole("button");
    const heroBtn = btns.find((b) => b.className.includes("bg-gradient-to-br"));
    expect(heroBtn).toBeTruthy();
    expect(heroBtn!.textContent).toMatch(/Talk to Nila/);
    expect(heroBtn!.textContent).toMatch(/A conversation/);
    fireEvent.click(heroBtn!);
    expect(go).toHaveBeenCalledWith("nila");
  });
});

describe("TodayScreen — phase-based section filtering (U1.1)", () => {
  const noop = () => {};
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-07-21T10:00:00")); });
  afterEach(() => { vi.useRealTimers(); });

  it("calm phase: only mood and hero render, no intention or week insight", () => {
    store.set("nilamind_daily_intention", JSON.stringify({ intention: "breathe", date: "2026-07-21" }));
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    // Click the Data button first (default phase at 10am is "data"), THEN click Calm
    const calmBtn = screen.getAllByRole("button", { name: /Calm/i }).find(
      (b) => b.closest("nav") !== null
    )!;
    fireEvent.click(calmBtn);
    // Mood card should be visible
    expect(screen.getByText(/How are you feeling/)).toBeTruthy();
    // This week insight should NOT be visible in calm phase
    expect(screen.queryByText(/This week/i)).toBeNull();
  });

  it("data phase: intention and week insight are visible", () => {
    const today = "2026-07-21";
    store.set("nilamind_checkins", JSON.stringify([{ date: today, emotion: "good", intensity: 6 }]));
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    expect(screen.getByText(/Set today's intention/)).toBeTruthy();
    // Week insight appears inline inside mood card (merged per U1.2)
    expect(screen.getByText(/This week/i)).toBeTruthy();
  });

  it("data phase: patterns toggle (Your week) is accessible", () => {
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    // Default phase at 10am morning is "data"
    expect(screen.queryByText(/Your week/i)).toBeTruthy();
  });

  it("protocol phase: hides mood, intention, and patterns (minimal surface)", () => {
    store.set("nilamind_daily_intention", JSON.stringify({ intention: "breathe", date: "2026-07-21" }));
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    const protocolBtn = screen.getAllByRole("button", { name: /Protocol/i }).find(
      (b) => b.closest("nav") !== null
    )!;
    fireEvent.click(protocolBtn);
    // Mood card hidden
    expect(screen.queryByText(/How are you feeling/)).toBeNull();
    // Intention hidden
    expect(screen.queryByText(/Set today's intention/i)).toBeNull();
    // Patterns hidden
    expect(screen.queryByText(/Your week/i)).toBeNull();
    // Crisis button still reachable
    expect(screen.getByRole("button", { name: /get help now/i })).toBeTruthy();
  });
});

describe("TodayScreen — data error feedback", () => {
  const noop = () => {};

  it("shows error banner when checkin storage is corrupted", () => {
    store.set("nilamind_checkins", "garbage");
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    expect(screen.getByText(/couldn't load/i)).toBeTruthy();
  });
});

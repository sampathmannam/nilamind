// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

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

import TodayScreen, { personalizeToolOrder, getHeroAction } from "./TodayScreen";
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

  it("promotes anxiety-relevant tools to the front of their group for Managing anxiety", () => {
    const groups = buildToolGroups(STUB);
    const result = personalizeToolOrder(groups, ["Managing anxiety"]);
    const inTheMoment = result.find((g) => g.title === "In the moment")!;
    expect(inTheMoment.rows[0].id).toBe("plan");
  });

  it("promotes mood-tracking tools to the front for Tracking moods", () => {
    const groups = buildToolGroups(STUB);
    const result = personalizeToolOrder(groups, ["Tracking moods"]);
    const logTrack = result.find((g) => g.title === "Log & track")!;
    expect(logTrack.rows[0].id).toBe("ema_checkin");
  });

  it("does not drop or duplicate any row when reordering", () => {
    const groups = buildToolGroups(STUB);
    const result = personalizeToolOrder(groups, ["Managing anxiety", "Tracking moods"]);
    expect(rowIds(result).sort()).toEqual(rowIds(groups).sort());
  });
});

// Wave 3 Group I (2026-07-12, confirmed product decision) — the Today hub's default hero action now
// leads with a structured tool (the daily if-then intention) rather than "Talk to Nila" as the
// primary CTA, whenever today's intention hasn't been set yet. Safety-adaptive branches (wind-down
// at night, grounding when anxious/elevated) stay unconditionally on top of this — they must never
// be displaced by an engagement nudge.
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

describe("TodayScreen — structured-tool lead, chat still one tap away", () => {
  const noop = () => {};

  it("renders the daily-intention card ahead of the 'Talk to Nila' card", () => {
    render(<TodayScreen go={noop} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    const intentionCard = document.getElementById("today-daily-intention");
    const chatCard = screen.getByText(/Talk to Nila/).closest("button")!;
    expect(intentionCard).toBeTruthy();
    // DOCUMENT_POSITION_FOLLOWING (4) means intentionCard comes BEFORE chatCard in the DOM.
    expect(intentionCard!.compareDocumentPosition(chatCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps chat reachable in exactly one tap from the default hero — 'Talk to Nila' always renders and navigates to nila", () => {
    const go = vi.fn();
    render(<TodayScreen go={go} phoneEnabled={false} onEpisode={noop} onOpenCrisis={noop} />);
    fireEvent.click(screen.getByText(/Talk to Nila/));
    expect(go).toHaveBeenCalledWith("nila");
  });
});

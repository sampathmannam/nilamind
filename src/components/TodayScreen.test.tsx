import { describe, it, expect } from "vitest";
import { personalizeToolOrder } from "./TodayScreen";
import { buildToolGroups, type ToolGroup } from "./toolsRows";

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

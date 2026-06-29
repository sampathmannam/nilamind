import { describe, it, expect } from "vitest";
import { buildToolGroups, type ToolRowDeps } from "./toolsRows";

// buildToolGroups() is the single source of truth ToolsScreen renders, so asserting on it guards the
// real, on-screen Tools hub (redesign §2): adding/removing a row is now a deliberate, tested change.
const STUB: ToolRowDeps = { go: () => {}, onEpisode: () => {}, phoneEnabled: false };
const rowIds = (phoneEnabled: boolean) =>
  buildToolGroups({ ...STUB, phoneEnabled }).flatMap((g) => g.rows.map((r) => r.id));

describe("Tools hub rows (redesign §2)", () => {
  it("renders the in-the-moment then log & track rows, in order, when phone is off", () => {
    expect(rowIds(false)).toEqual(["plan", "winddown", "reach_out", "episode", "diary", "assessment"]);
  });

  it("appends the phone patterns row only when phone features are enabled", () => {
    expect(rowIds(false)).not.toContain("behaviour");
    expect(rowIds(true)).toEqual([
      "plan", "winddown", "reach_out", "episode", "diary", "assessment", "behaviour",
    ]);
  });

  it("groups rows under the redesigned section titles", () => {
    expect(buildToolGroups({ ...STUB, phoneEnabled: false }).map((g) => g.title)).toEqual([
      "In the moment", "Log & track",
    ]);
    expect(buildToolGroups({ ...STUB, phoneEnabled: true }).map((g) => g.title)).toEqual([
      "In the moment", "Log & track", "Patterns",
    ]);
  });

  it("wires episode support to the onEpisode action, not a route", () => {
    let routed: string | null = null;
    let episodeCalled = false;
    const groups = buildToolGroups({
      go: (t) => { routed = t; },
      onEpisode: () => { episodeCalled = true; },
      phoneEnabled: false,
    });
    const episode = groups.flatMap((g) => g.rows).find((r) => r.id === "episode")!;
    episode.onTap();
    expect(episodeCalled).toBe(true);
    expect(routed).toBeNull();
  });

  it("keeps every re-homed row out of the Tools hub", () => {
    const all = rowIds(true);
    for (const gone of [
      "skills", "thought_record", "self_compassion",
      "behavioural_activation", "values_compass", "episode_agent", "checkin",
    ]) {
      expect(all).not.toContain(gone);
    }
  });
});

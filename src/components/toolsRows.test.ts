import { describe, it, expect } from "vitest";
import { buildToolGroups, type ToolRowDeps } from "./toolsRows";

const STUB: ToolRowDeps = { go: () => {}, onEpisode: () => {}, phoneEnabled: false };
const rowIds = (phoneEnabled: boolean) =>
  buildToolGroups({ ...STUB, phoneEnabled }).flatMap((g) => g.rows.map((r) => r.id));

describe("Tools hub rows (redesign §2)", () => {
  it("renders all tool rows in order, when phone is off", () => {
    expect(rowIds(false)).toEqual([
      "plan", "winddown", "reach_out", "crisis_rehearsal", "relapse_plan", "episode",
      "ema_checkin", "diary", "assessment", "medication", "social_rhythm",
      "problem_solving", "values_work", "exposure", "peer_support",
    ]);
  });

  it("appends the phone patterns row only when phone features are enabled", () => {
    expect(rowIds(false)).not.toContain("behaviour");
    const withPhone = rowIds(true);
    expect(withPhone).toContain("behaviour");
    expect(withPhone.indexOf("behaviour")).toBeGreaterThan(withPhone.indexOf("diary"));
  });

  it("groups rows under the redesigned section titles", () => {
    expect(buildToolGroups({ ...STUB, phoneEnabled: false }).map((g) => g.title)).toEqual([
      "In the moment", "Log & track", "Skills & practice",
    ]);
    expect(buildToolGroups({ ...STUB, phoneEnabled: true }).map((g) => g.title)).toEqual([
      "In the moment", "Log & track", "Skills & practice", "Patterns",
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

  it("routes the quick check-in row to the ema_checkin screen", () => {
    let routed: string | null = null;
    const groups = buildToolGroups({ go: (t) => { routed = t; }, onEpisode: () => {}, phoneEnabled: false });
    const ema = groups.flatMap((g) => g.rows).find((r) => r.id === "ema_checkin")!;
    expect(ema).toBeTruthy();
    ema.onTap();
    expect(routed).toBe("ema_checkin");
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

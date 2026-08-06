import { describe, it, expect, vi } from "vitest";
import { buildToolGroups, type ToolRowDeps } from "./toolsRows";

const store = new Map<string, string>();
vi.mock("../services/storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  }),
  DAY_MS: 86_400_000,
}));

const STUB: ToolRowDeps = { go: () => {}, onEpisode: () => {}, phoneEnabled: false };
const rowIds = (phoneEnabled: boolean) =>
  buildToolGroups({ ...STUB, phoneEnabled }).flatMap((g) => g.rows.map((r) => r.id));

// Redesign 2026-08-06 (§5.3, deliberate golden update): 14 flat rows → 9 rows under 4 headers.
// Calm/Skills fan out through hub launchers; episode support + safety plan get calm-time entries
// ("In the moment" first — when someone opens Tools in distress, the top row is the right one);
// the dashboard row moved to You ("Patterns").
describe("Tools hub rows (redesign §5.3)", () => {
  it("renders exactly the 9 redesigned rows in order", () => {
    expect(rowIds(false)).toEqual([
      "episode", "safety_plan",
      "calm_hub", "reach_out",
      "ema_checkin", "diary", "medication",
      "assessment", "skills_hub",
    ]);
  });

  it("phoneEnabled no longer adds a dashboard row — Patterns lives on the You tab now", () => {
    expect(rowIds(true)).toEqual(rowIds(false));
    expect(rowIds(true)).not.toContain("dashboard");
  });

  it("groups rows under the four redesigned section titles", () => {
    expect(buildToolGroups({ ...STUB, phoneEnabled: false }).map((g) => g.title)).toEqual([
      "In the moment", "Calm", "Log & track", "Skills & practice",
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

  it("routes safety_plan, calm_hub, skills_hub and ema_checkin through go()", () => {
    const routed: string[] = [];
    const groups = buildToolGroups({ go: (t) => { routed.push(t); }, onEpisode: () => {}, phoneEnabled: false });
    const byId = new Map(groups.flatMap((g) => g.rows).map((r) => [r.id, r]));
    for (const id of ["safety_plan", "calm_hub", "skills_hub", "ema_checkin"]) {
      byId.get(id)!.onTap();
    }
    expect(routed).toEqual(["safety_plan", "calm_hub", "skills_hub", "ema_checkin"]);
  });

  it("keeps hub children and re-homed rows out of the top level", () => {
    const all = rowIds(true);
    for (const gone of [
      // hub children (Calm hub)
      "plan", "winddown", "sounds",
      // hub children (Skills hub)
      "problem_solving", "values_to_action", "social_rhythm", "exposure", "relapse_plan", "chain_analysis", "guided_programs",
      // moved to You
      "dashboard",
      // long-retired rows
      "skills", "thought_record", "self_compassion", "behavioural_activation", "values_compass", "episode_agent", "checkin", "values_work",
    ]) {
      expect(all, `top-level leak: ${gone}`).not.toContain(gone);
    }
  });

  it("no group hides behind a 'more' toggle anymore — 9 rows are always visible", () => {
    for (const g of buildToolGroups({ ...STUB, phoneEnabled: false })) {
      expect(g.more, `group "${g.title}" should not be collapsed`).toBeUndefined();
    }
  });
});

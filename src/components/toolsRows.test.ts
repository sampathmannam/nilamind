import { describe, it, expect, beforeEach, vi } from "vitest";
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

describe("Tools hub rows (redesign §2)", () => {
  it("renders all tool rows in order, when phone is off", () => {
    expect(rowIds(false)).toEqual([
      "plan", "winddown", "sounds", "reach_out", "episode",
      "ema_checkin", "diary", "medication",
      "problem_solving", "values_to_action", "assessment", "social_rhythm", "exposure", "relapse_plan",
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

  it("retired values_work (uncited duplicate) — values_to_action (VLQ-cited) took its place, wave 3 Group B", () => {
    const all = rowIds(true);
    expect(all).not.toContain("values_work");
    expect(all).toContain("values_to_action");
  });

  it("marks the Skills & practice group as 'more' (hidden behind a toggle, not shown by default)", () => {
    const groups = buildToolGroups({ ...STUB, phoneEnabled: false });
    const skills = groups.find((g) => g.rows.some((r) => r.id === "problem_solving"))!;
    expect(skills).toBeDefined();
    expect(skills.more).toBe(true);
  });

  it("does not mark In the moment or Log & track as 'more'", () => {
    const groups = buildToolGroups({ ...STUB, phoneEnabled: false });
    for (const g of groups) {
      if (g.rows.some((r) => r.id === "plan" || r.id === "winddown")) {
        expect(g.more).toBeUndefined();
      }
      if (g.rows.some((r) => r.id === "ema_checkin" || r.id === "diary")) {
        expect(g.more).toBeUndefined();
      }
    }
  });

  it("routes the values_to_action row through go(), same as every other Skills & practice row", () => {
    let routed: string | null = null;
    const groups = buildToolGroups({ go: (t) => { routed = t; }, onEpisode: () => {}, phoneEnabled: false });
    const row = groups.flatMap((g) => g.rows).find((r) => r.id === "values_to_action")!;
    expect(row).toBeTruthy();
    row.onTap();
    expect(routed).toBe("values_to_action");
  });
});

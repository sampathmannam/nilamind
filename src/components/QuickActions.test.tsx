import { describe, it, expect } from "vitest";
import { selectQuickActions } from "./QuickActions";

// Manic-first: when the user is elevated the home QUIETS DOWN — the quick-action grid surfaces only
// down-regulating / co-regulating tools and drops the activating / information-seeking / analytical ones.
// Everything stays reachable via the Tools tab; this only calms the home surface (mirrors the settling orb
// + "let's slow things down" copy). The four calming tiles are all verified to route to real handlers.
describe("selectQuickActions — home actions quiet down when elevated", () => {
  it("non-elevated (calm) → the time-filtered set, capped at 9, incl. activating tools", () => {
    const day = selectQuickActions("day", "calm");
    expect(day.length).toBeGreaterThan(0);
    expect(day.length).toBeLessThanOrEqual(9);
    expect(day.every((a) => a.modes.includes("day"))).toBe(true);
    expect(day.map((a) => a.id)).toContain("learn"); // stimulating tool present when not elevated
  });

  it("elevated → only the down-regulating / co-regulating tools", () => {
    const ids = selectQuickActions("day", "elevated").map((a) => a.id);
    for (const calming of ["grounding", "breathing", "reach_out", "wind_down"]) {
      expect(ids).toContain(calming);
    }
    for (const dropped of ["learn", "dashboard", "thought_record", "values_to_action", "diary", "medication"]) {
      expect(ids).not.toContain(dropped);
    }
  });

  it("elevated surfaces FEWER options than the calm set (quieter)", () => {
    expect(selectQuickActions("day", "elevated").length).toBeLessThan(
      selectQuickActions("day", "calm").length,
    );
  });

  it("elevated calming tools stay available regardless of time (e.g. night)", () => {
    const ids = selectQuickActions("night", "elevated").map((a) => a.id);
    expect(ids).toContain("grounding");
    expect(ids).toContain("breathing");
  });

  it("null/unknown state behaves like the normal time-filtered set", () => {
    expect(selectQuickActions("day", null).map((a) => a.id)).toContain("learn");
  });
});

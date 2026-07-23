import { describe, it, expect } from "vitest";
import { selectQuickActions } from "./QuickActions";

// Manic-first: when the user is elevated the home QUIETS DOWN — the quick-action grid surfaces only
// down-regulating / co-regulating tools and drops the activating / information-seeking / analytical ones.
// Everything stays reachable via the Tools tab; this only calms the home surface (mirrors the settling orb
// + "let's slow things down" copy). The four calming tiles are all verified to route to real handlers.
describe("selectQuickActions — home actions quiet down when elevated", () => {
  it("non-elevated (calm) → all time-appropriate actions shown (C-3 dim-not-hide), incl. activating tools", () => {
    const day = selectQuickActions("day", "calm");
    expect(day.length).toBeGreaterThan(0);
    // C-3: no cap — all time-appropriate actions shown, dimmed ones too
    expect(day.every((a) => a.modes.includes("day") || !a.active)).toBe(true);
    expect(day.map((a) => a.id)).toContain("diary"); // accessible when not elevated
    // All active actions have active=true, dimmed have active=false
    const active = day.filter((a) => a.active);
    expect(active.length).toBeGreaterThan(0);
  });

  it("elevated → only the down-regulating / co-regulating tools, all active", () => {
    const elevated = selectQuickActions("day", "elevated");
    const ids = elevated.map((a) => a.id);
    for (const calming of ["grounding", "breathing", "reach_out", "wind_down"]) {
      expect(ids).toContain(calming);
    }
    for (const dropped of ["learn", "dashboard", "thought_record", "values_to_action", "diary", "medication"]) {
      expect(ids).not.toContain(dropped);
    }
    // All elevated actions are active
    expect(elevated.every((a) => a.active)).toBe(true);
  });

  it("elevated surfaces at most as many as the calm set (quieter or equal with Mohr cap)", () => {
    expect(selectQuickActions("day", "elevated").length).toBeLessThanOrEqual(
      selectQuickActions("day", "calm").length,
    );
  });

  it("elevated calming tools stay available regardless of time (e.g. night)", () => {
    const ids = selectQuickActions("night", "elevated").map((a) => a.id);
    expect(ids).toContain("grounding");
    expect(ids).toContain("breathing");
  });

  it("null/unknown state behaves like the normal time-filtered set", () => {
    const result = selectQuickActions("day", null);
    expect(result.map((a) => a.id)).toContain("diary");
    // C-3: includes dimmed actions too
    expect(result.length).toBeGreaterThan(0);
  });

  it("C-3: all time-appropriate actions shown, inactive ones dimmed (active=false)", () => {
    const day = selectQuickActions("day", "calm");
    const activeIds = day.filter((a) => a.active).map((a) => a.id);
    const dimmedIds = day.filter((a) => !a.active).map((a) => a.id);
    // Active actions should include time-appropriate tools
    expect(activeIds).toContain("diary");
    // Dimmed actions may exist (time-inappropriate but still shown)
    if (dimmedIds.length > 0) {
      // Dimmed actions should NOT be in the current time mode
      for (const id of dimmedIds) {
        const action = day.find((a) => a.id === id);
        expect(action?.modes).not.toContain("day");
      }
    }
  });

  // 2026-07-12 de-emphasis (user directive): the crisis shortcut is NOT a permanent fixture of the
  // home grid — it must not be constantly visible. The real §9 safety net is the input gate (fires on
  // any crisis message regardless of button), so this only changes prominence, not reachability. The
  // shortcut re-surfaces precisely when the user is `low`/distressed (visible when needed).
  it("calm/anxious → crisis shortcut is NOT in the home grid (de-emphasized)", () => {
    expect(selectQuickActions("day", "calm").map((a) => a.id)).not.toContain("crisis");
    expect(selectQuickActions("day", "anxious").map((a) => a.id)).not.toContain("crisis");
    expect(selectQuickActions("morning", "calm").map((a) => a.id)).not.toContain("crisis");
  });

  it("low/distressed → crisis shortcut re-appears (visible when needed)", () => {
    expect(selectQuickActions("day", "low").map((a) => a.id)).toContain("crisis");
  });

  it("null state → crisis shortcut absent (not constantly visible)", () => {
    expect(selectQuickActions("day", null).map((a) => a.id)).not.toContain("crisis");
  });
});

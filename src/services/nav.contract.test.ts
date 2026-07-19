import { describe, it, expect } from "vitest";
import { resolveNavTarget, KNOWN_AUX_VIEWS, TAB_TARGETS, type AuxView, type TabView } from "./nav";

/**
 * Navigation CONTRACT (seal, don't migrate — the safe precursor to any future nav/overlay unification).
 *
 * The per-route spot-checks live in nav.test.ts. This file pins the WHOLE surface so a future refactor is a
 * "refactor against a pinned contract", not a rewrite against nothing:
 *  - every allowlisted tab / aux view actually round-trips through resolveNavTarget (catches the latent bug
 *    class where a route is added to the AuxView type union but NOT to KNOWN_AUX_VIEWS — it type-checks yet
 *    resolves to a silent {unknown} no-op);
 *  - the allowlists themselves match a frozen golden set (any add/remove is then a deliberate, reviewed edit);
 *  - the §9-relevant + divergence cases are stated explicitly (crisis, grounding, and that navStore's "tools"
 *    tab is intentionally NOT a resolver TabView).
 *
 * This test asserts CURRENT behaviour verbatim — it must stay green through any Phase 3 nav change.
 */

// Frozen golden of the tab allowlist. resolveNavTarget's own TabView union.
const GOLDEN_TABS: readonly TabView[] = ["diary", "plan", "nila", "today", "you"];

// Frozen golden of the aux allowlist, in declaration order.
const GOLDEN_AUX: readonly AuxView[] = [
  "about_nila", "insights", "thought_record", "settings", "behaviour", "reach_out", "assessment",
  "dashboard", "your_data", "nila_memory", "winddown",
  "learn", "medication", "problem_solving", "values_work", "exposure", "relapse_plan", "caregiver", "episode",
  "diary", "dbt_diary_card", "social_rhythm", "ema_checkin", "episode_marker",
  "caregiver_settings", "legal", "sounds", "safety_plan", "values_to_action",
];

describe("nav contract — allowlists are frozen (any change is deliberate)", () => {
  it("TAB_TARGETS matches the golden set", () => {
    expect([...TAB_TARGETS]).toEqual([...GOLDEN_TABS]);
  });
  it("KNOWN_AUX_VIEWS matches the golden set (as a set — order is not load-bearing)", () => {
    expect([...KNOWN_AUX_VIEWS].sort()).toEqual([...GOLDEN_AUX].sort());
  });
  it("KNOWN_AUX_VIEWS has no duplicates", () => {
    expect(new Set(KNOWN_AUX_VIEWS).size).toBe(KNOWN_AUX_VIEWS.length);
  });
});

describe("nav contract — every allowlisted route round-trips (no typed-but-unresolvable routes)", () => {
  it("every TAB_TARGET resolves to its own tab", () => {
    for (const tab of TAB_TARGETS) {
      expect(resolveNavTarget(tab)).toEqual({ kind: "tab", tab });
    }
  });

  it("every KNOWN_AUX_VIEW resolves to its own aux view", () => {
    // "diary" is in BOTH lists; the tab allowlist is checked first, so it resolves as a tab, not aux.
    // That precedence is the real behaviour — pin it rather than paper over it.
    for (const view of KNOWN_AUX_VIEWS) {
      const expected =
        (TAB_TARGETS as readonly string[]).includes(view)
          ? { kind: "tab", tab: view }
          : { kind: "aux", view };
      expect(resolveNavTarget(view)).toEqual(expected);
    }
  });

  it("'diary' resolves as a TAB (tab allowlist wins over the same-named aux entry)", () => {
    expect(resolveNavTarget("diary")).toEqual({ kind: "tab", tab: "diary" });
  });
});

describe("nav contract — §9 + special cases + navStore divergence", () => {
  it("crisis is its own resolution (the crisis overlay, never a tab/aux)", () => {
    expect(resolveNavTarget("crisis")).toEqual({ kind: "crisis" });
  });
  it("grounding maps to the plan tab (the crisis overlay depends on this mapping)", () => {
    expect(resolveNavTarget("grounding")).toEqual({ kind: "plan" });
  });
  it("navStore's 'tools' tab is intentionally NOT a resolver TabView (→ unknown no-op)", () => {
    // navStore.AppTab = nila|today|tools|you, but resolveNavTarget's TabView has no "tools" — a documented
    // divergence a future unification must reconcile deliberately, not by accident.
    expect(resolveNavTarget("tools")).toEqual({ kind: "unknown", target: "tools" });
  });
  it("an unknown/typo'd target is a deliberate no-op, never a blank tab", () => {
    expect(resolveNavTarget("totally_made_up")).toEqual({ kind: "unknown", target: "totally_made_up" });
    expect(resolveNavTarget("")).toEqual({ kind: "unknown", target: "" });
  });
});

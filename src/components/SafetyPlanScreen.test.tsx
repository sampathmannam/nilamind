// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  SENSITIVE_KEYS: [] as string[],
}));

import SafetyPlanScreen from "./SafetyPlanScreen";

const DRAFT = {
  warningSigns: "staying up scrolling, snapping at people",
  internalCoping: "cold water on my face",
  socialDistractors: "walk to the park",
  safeEnvironment: "meds in another room",
};

afterEach(cleanup);
beforeEach(() => { store.clear(); });

describe("SafetyPlanScreen — capture from chat (§9-adjacent rails)", () => {
  it("pre-fills empty coping fields from the draft and shows the 'from our chat' banner", () => {
    render(<SafetyPlanScreen draft={DRAFT} />);
    expect(screen.getByText(/started from our chat/i)).toBeTruthy();
    expect((screen.getByDisplayValue(DRAFT.warningSigns) as HTMLTextAreaElement).value).toBe(DRAFT.warningSigns);
    expect(screen.getByDisplayValue(DRAFT.internalCoping)).toBeTruthy();
    // The draft is NOT persisted just by opening — the person must edit/save.
    expect(store.get("nilamind_safetyplan")).toBeUndefined();
  });

  it("NEVER overwrites fields the person has already saved", () => {
    store.set("nilamind_safetyplan", JSON.stringify({ warningSigns: "MY OWN saved warning signs", internalCoping: "" }));
    render(<SafetyPlanScreen draft={DRAFT} />);
    // saved field is untouched...
    expect(screen.getByDisplayValue("MY OWN saved warning signs")).toBeTruthy();
    expect(screen.queryByDisplayValue(DRAFT.warningSigns)).toBeNull();
    // ...but a field that was empty gets the draft.
    expect(screen.getByDisplayValue(DRAFT.internalCoping)).toBeTruthy();
  });

  it("shows no draft banner when there is no draft", () => {
    render(<SafetyPlanScreen />);
    expect(screen.queryByText(/started from our chat/i)).toBeNull();
  });
});

// 2026-08-06 audit fix: createSkillsBridge/markUsed/isInCooldown/nextStep (safetyPlanSkills.ts) had zero
// callers anywhere -- the ladder was a static reference list. These tests cover the newly-wired
// mark-as-tried interaction and its persistence.
describe("SafetyPlanScreen — Skills Ladder bridge (2026-08-06 wiring)", () => {
  it("renders all 6 default ladder steps with a 'mark as tried' control on each", () => {
    render(<SafetyPlanScreen />);
    expect(screen.getByRole("button", { name: /mark stop as tried/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /mark paced breathing as tried/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /mark reach out as tried/i })).toBeTruthy();
  });

  it("marking a step tried persists lastUsed/cooldownUntil to secureLocal", () => {
    render(<SafetyPlanScreen />);
    fireEvent.click(screen.getByRole("button", { name: /mark stop as tried/i }));
    const raw = store.get("nilamind_safety_skills_bridge");
    expect(raw).toBeTruthy();
    const bridge = JSON.parse(raw!);
    expect(typeof bridge.lastUsed).toBe("string");
    expect(typeof bridge.cooldownUntil).toBe("string");
  });

  it("shows the 'try this next' hint on the step after the one just marked tried", () => {
    render(<SafetyPlanScreen />);
    fireEvent.click(screen.getByRole("button", { name: /mark stop as tried/i }));
    // DEFAULT_LADDER order: stop -> pace ("Paced Breathing") -> surf -> tipp -> delay -> reach
    expect(screen.getByText(/try this next/i)).toBeTruthy();
  });

  it("shows a gentle (non-blocking) cooldown note when the ladder was used within 24h, loaded from a prior session", () => {
    const now = Date.now();
    store.set("nilamind_safety_skills_bridge", JSON.stringify({
      steps: [{ skillId: "stop", label: "STOP", duration: "60 seconds", instructions: "Freeze. Breathe. Observe." }],
      lastUsed: new Date(now - 60_000).toISOString(),
      cooldownUntil: new Date(now + 23 * 60 * 60 * 1000).toISOString(),
    }));
    render(<SafetyPlanScreen />);
    expect(screen.getByText(/worked through this ladder recently/i)).toBeTruthy();
    // Non-blocking: every step is still present and usable.
    expect(screen.getByRole("button", { name: /mark stop as tried/i })).toBeTruthy();
  });

  it("does not show the cooldown note on a fresh bridge (never used)", () => {
    render(<SafetyPlanScreen />);
    expect(screen.queryByText(/worked through this ladder recently/i)).toBeNull();
  });
});

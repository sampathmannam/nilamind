// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

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

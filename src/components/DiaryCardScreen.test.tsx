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
}));
vi.mock("../hooks/useHaptics", () => ({ hapticMedium: vi.fn() }));
vi.mock("../services/coachAssist", () => ({ analyzeQuickNote: vi.fn() }));
vi.mock("../services/voice", () => ({ listenOnce: vi.fn(), stopListening: vi.fn() }));

import DiaryCardScreen from "./DiaryCardScreen";
import { getDailyIntention } from "../services/weeklyIntention";

afterEach(cleanup);
beforeEach(() => { store.clear(); });

// Wave 3 Group I (2026-07-12) — the diary's free-text "Morning Intention" field was one of three
// independent, contradictory "intention" surfaces (synthesis finding). It's replaced here by the
// same structured DailyIntentionCard used on the Today hub, backed by the ONE canonical
// weeklyIntention.ts daily-intention store — not a separate diary-local free-text field.
describe("DiaryCardScreen — Part 3 now defers to the unified daily-intention store", () => {
  it("no longer renders the old free-text 'Morning Intention' input", () => {
    render(<DiaryCardScreen />);
    expect(screen.queryByPlaceholderText(/note to self/i)).toBeNull();
  });

  it("renders the shared if-then DailyIntentionCard picker instead", () => {
    render(<DiaryCardScreen />);
    expect(screen.getByLabelText("If")).toBeTruthy();
    expect(screen.getByLabelText("Then")).toBeTruthy();
  });

  it("reflects an intention already set elsewhere (e.g. from the Today hub) via the shared store", () => {
    store.set(
      "nilamind_daily_intention",
      JSON.stringify({ if: "it's 8am", then: "go for a short walk", date: new Date().toISOString().split("T")[0] }),
    );
    render(<DiaryCardScreen />);
    expect(screen.getByText(/it's 8am/)).toBeTruthy();
    expect(getDailyIntention()?.if).toBe("it's 8am");
  });
});

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
}));
vi.mock("../hooks/useHaptics", () => ({ hapticMedium: vi.fn() }));

import DailyIntentionCard from "./DailyIntentionCard";
import { getDailyIntention } from "../services/weeklyIntention";

afterEach(cleanup);
beforeEach(() => { store.clear(); });

// Wave 3 Group I — the if-then picker that replaces the free-text diary field and the chat-embedded
// "What's your intention for today?" question with the ONE canonical daily-intention store.
describe("DailyIntentionCard", () => {
  it("renders the if/then picker with both inputs when no intention is set today", () => {
    render(<DailyIntentionCard />);
    expect(screen.getByLabelText("If")).toBeTruthy();
    expect(screen.getByLabelText("Then")).toBeTruthy();
  });

  it("does not persist an intention until both if/then fields are filled", () => {
    render(<DailyIntentionCard />);
    const saveBtn = screen.getByRole("button", { name: /save intention/i });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    expect(getDailyIntention()).toBeNull();
  });

  it("saves the if-then plan to the unified daily-intention store and switches to the saved view", () => {
    render(<DailyIntentionCard />);
    fireEvent.change(screen.getByLabelText("If"), { target: { value: "I feel anxious after lunch" } });
    fireEvent.change(screen.getByLabelText("Then"), { target: { value: "do a 2-minute breathing exercise" } });
    fireEvent.click(screen.getByRole("button", { name: /save intention/i }));

    const saved = getDailyIntention();
    expect(saved?.if).toBe("I feel anxious after lunch");
    expect(saved?.then).toBe("do a 2-minute breathing exercise");
    expect(screen.getByText(/I feel anxious after lunch/)).toBeTruthy();
    expect(screen.getByText(/do a 2-minute breathing exercise/)).toBeTruthy();
  });

  it("renders the saved summary view (not the form) when an intention already exists for today", () => {
    store.set(
      "nilamind_daily_intention",
      JSON.stringify({ if: "it's 8am", then: "go for a short walk", date: new Date().toISOString().split("T")[0] }),
    );
    render(<DailyIntentionCard />);
    expect(screen.queryByLabelText("If")).toBeNull();
    expect(screen.getByText(/it's 8am/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /edit/i })).toBeTruthy();
  });

  it("returns to the editable form when Edit is tapped on an already-set intention", () => {
    store.set(
      "nilamind_daily_intention",
      JSON.stringify({ if: "it's 8am", then: "go for a short walk", date: new Date().toISOString().split("T")[0] }),
    );
    render(<DailyIntentionCard />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByLabelText("If")).toBeTruthy();
  });
});

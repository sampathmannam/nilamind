// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// Clinical research upgrades wave 2 (2026-07-12), Task C — close the BA mood loop in the actual UI users touch
// for Behavioural Activation (the merged Values-to-Action screen bypasses protocolBA.ts and writes activities
// directly). moodBefore is captured when planning an activity; moodAfter is captured in the rating panel
// alongside mastery/pleasure. Per Jacobson, Martell & Dimidjian (2001), Clin Psychol Sci Pract.

const store: Record<string, string> = {};
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
  SENSITIVE_KEYS: [] as string[],
}));

// Haptics is a native Capacitor plugin — no-op it in the jsdom test environment.
vi.mock("../hooks/useHaptics", () => ({
  hapticLight: () => {},
  hapticSuccess: () => {},
}));

import ValuesToActionScreen from "./ValuesToActionScreen";
import { loadActivities } from "../services/behaviouralActivation";

afterEach(cleanup);
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

describe("ValuesToActionScreen — values captured from chat", () => {
  it("surfaces the domains that came up in chat as a starting point, without pre-rating anything", () => {
    render(<ValuesToActionScreen highlightDomains={["family", "work"]} />);
    const note = screen.getByText(/these came up when we talked/i);
    expect(note.textContent).toContain("Family");
    expect(note.textContent).toContain("Work & purpose");
    // The person still rates — importance sliders exist and are untouched (default), nothing pre-filled.
    expect(store["nilamind_values"]).toBeUndefined();
  });

  it("shows no such banner when nothing came up", () => {
    render(<ValuesToActionScreen />);
    expect(screen.queryByText(/these came up when we talked/i)).toBeNull();
  });
});

describe("ValuesToActionScreen — BA mood-loop closure (Task C)", () => {
  it("captures moodBefore when planning an activity for later", () => {
    render(<ValuesToActionScreen />);

    // Pick the first activity idea in the default "movement" category.
    const activityButtons = screen.getAllByText("Walk outside");
    fireEvent.click(activityButtons[0]);

    // Adjust the mood-before slider away from its default.
    const moodSlider = screen.getByLabelText(/how are you feeling right now/i);
    fireEvent.change(moodSlider, { target: { value: "3" } });

    fireEvent.click(screen.getByText(/plan for later/i));

    const activities = loadActivities();
    expect(activities).toHaveLength(1);
    expect(activities[0].moodBefore).toBe(3);
  });

  it("captures moodAfter in the rating panel alongside mastery/pleasure", () => {
    render(<ValuesToActionScreen />);

    const activityButtons = screen.getAllByText("Walk outside");
    fireEvent.click(activityButtons[0]);
    fireEvent.click(screen.getByText(/i did this/i));

    // Now in the rating panel.
    const moodAfterSlider = screen.getByLabelText(/mood after/i);
    fireEvent.change(moodAfterSlider, { target: { value: "8" } });

    fireEvent.click(screen.getByText(/log it/i));

    const activities = loadActivities();
    expect(activities).toHaveLength(1);
    expect(activities[0].status).toBe("done");
    expect(activities[0].moodAfter).toBe(8);
  });
});

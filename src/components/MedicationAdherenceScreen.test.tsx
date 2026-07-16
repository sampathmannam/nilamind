// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import MedicationAdherenceScreen from "./MedicationAdherenceScreen";

afterEach(() => { cleanup(); store.clear(); });

// Regression (device screenshot, 2026-07-16): tapping "Add medication" on an empty list opened the
// add form while the "No medications tracked" empty-state placeholder (with its own duplicate "Add
// medication" CTA) stayed rendered underneath it.
describe("MedicationAdherenceScreen — no duplicate empty-state while the add form is open", () => {
  it("hides the empty-state placeholder once the add form is opened", () => {
    render(<MedicationAdherenceScreen />);
    expect(screen.getByText(/no medications tracked/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.queryByText(/no medications tracked/i)).toBeNull();
    expect(screen.getByRole("button", { name: /save medication/i })).toBeTruthy();
  });
});

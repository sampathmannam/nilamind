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
vi.mock("../hooks/useHaptics", () => ({ hapticLight: vi.fn(), hapticMedium: vi.fn() }));

import ToolsScreen from "./ToolsScreen";

afterEach(cleanup);
beforeEach(() => { store.clear(); });

// The Tools tab (4-tab IA, 2026-07-18) is now the sole home of the tool library that used to be a
// collapsible section on Today. These guard the real, on-screen surface: the hub header, the always-on
// tool rows, and that search narrows to matching rows — including ones behind the "Skills & practice"
// expander, which an active query must reveal.
describe("ToolsScreen", () => {
  const props = { go: vi.fn(), onEpisode: vi.fn(), phoneEnabled: false };

  it("renders the hub header and the core always-visible tools", () => {
    render(<ToolsScreen {...props} />);
    expect(screen.getByRole("heading", { name: "Tools", level: 1 })).toBeTruthy();
    // A representative always-on row from the un-collapsed groups.
    expect(screen.getByText("Grounding & breathing")).toBeTruthy();
  });

  it("filters rows to the query and drops non-matching groups", () => {
    render(<ToolsScreen {...props} />);
    fireEvent.change(screen.getByLabelText("Search tools"), { target: { value: "sleep" } });
    expect(screen.getByText("Wind down for sleep")).toBeTruthy();
    // A row with no 'sleep' in its label/sub is gone.
    expect(screen.queryByText("Grounding & breathing")).toBeNull();
  });

  it("reveals otherwise-collapsed 'more' tools when searching", () => {
    // A brand-new user has not expanded "Skills & practice"; with no query those rows stay hidden,
    // but a search must surface them so nothing is unfindable.
    render(<ToolsScreen {...props} />);
    // "Exposure hierarchy" lives in the collapsed skills group — hidden before any search.
    expect(screen.queryByText(/exposure hierarchy/i)).toBeNull();
    fireEvent.change(screen.getByLabelText("Search tools"), { target: { value: "exposure" } });
    expect(screen.getByText(/exposure hierarchy/i)).toBeTruthy();
  });

  it("clears the query via the clear button", () => {
    render(<ToolsScreen {...props} />);
    const input = screen.getByLabelText("Search tools") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "sleep" } });
    fireEvent.click(screen.getByLabelText("Clear search"));
    expect(input.value).toBe("");
    // Full list is back.
    expect(screen.getByText("Grounding & breathing")).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

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
import { TOOL_META } from "./toolMeta";

afterEach(cleanup);
beforeEach(() => { store.clear(); });

// Redesign 2026-08-06 (§5.3): 4 sections, 9 rows, single-source from toolsRows; Calm/Skills fan out
// through hubs; episode support + safety plan restored to reachability; crisis pill in the header.
describe("ToolsScreen", () => {
  const props = { go: vi.fn(), onEpisode: vi.fn(), phoneEnabled: false, onOpenCrisis: vi.fn() };

  it("renders the hub header with the crisis Help pill", async () => {
    render(<ToolsScreen {...props} />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Tools", level: 1 })).toBeTruthy();
      expect(screen.getByRole("button", { name: /get help now/i })).toBeTruthy();
    });
  });

  it("renders all 4 sections in order: In the moment, Calm, Log & track, Skills & practice", async () => {
    render(<ToolsScreen {...props} />);
    await waitFor(() => {
      for (const name of ["In the moment", "Calm", "Log & track", "Skills & practice"]) {
        expect(screen.getByRole("heading", { name }), `section missing: ${name}`).toBeTruthy();
      }
    });
  });

  it("In the moment leads with episode support + safety plan", async () => {
    render(<ToolsScreen {...props} />);
    await waitFor(() => {
      expect(screen.getByText(TOOL_META.episode.label())).toBeTruthy();
      expect(screen.getByText(TOOL_META.safety_plan.label())).toBeTruthy();
    });
    fireEvent.click(screen.getByText(TOOL_META.episode.label()));
    expect(props.onEpisode).toHaveBeenCalled();
    fireEvent.click(screen.getByText(TOOL_META.safety_plan.label()));
    expect(props.go).toHaveBeenCalledWith("safety_plan");
  });

  it("Calm + Skills fan out through hub rows", async () => {
    render(<ToolsScreen {...props} />);
    await waitFor(() => {
      expect(screen.getByText(TOOL_META.calm_hub.label())).toBeTruthy();
    });
    fireEvent.click(screen.getByText(TOOL_META.calm_hub.label()));
    expect(props.go).toHaveBeenCalledWith("calm_hub");
    fireEvent.click(screen.getByText(TOOL_META.skills_hub.label()));
    expect(props.go).toHaveBeenCalledWith("skills_hub");
  });

  it("Log & track keeps its three direct rows", async () => {
    render(<ToolsScreen {...props} />);
    await waitFor(() => {
      expect(screen.getByText(TOOL_META.diary.label())).toBeTruthy();
    });
    fireEvent.click(screen.getByText(TOOL_META.diary.label()));
    expect(props.go).toHaveBeenCalledWith("diary");
    fireEvent.click(screen.getByText(TOOL_META.ema_checkin.label()));
    expect(props.go).toHaveBeenCalledWith("ema_checkin");
    fireEvent.click(screen.getByText(TOOL_META.medication.label()));
    expect(props.go).toHaveBeenCalledWith("medication");
  });

  it("renders exactly 9 catalog rows", async () => {
    render(<ToolsScreen {...props} />);
    await waitFor(() => {
      expect(screen.getByText(TOOL_META.calm_hub.label())).toBeTruthy();
    });
    const sections = Array.from(document.querySelectorAll("section"));
    const rowCount = sections.reduce((n, s) => n + s.querySelectorAll("button").length, 0);
    expect(rowCount).toBe(9);
  });

  // 15-day longitudinal run (2026-08-24): "Pinned" re-rendered rows that were already visible in the
  // catalog below it, so at day 7 "Calm space" appeared twice on one screen — same icon, same label,
  // same subtitle. The catalog is 9 rows; a shortcut to a row you can already see is just a duplicate.
  it("never shows a tool twice on the same screen, however much it has been used", async () => {
    store.set("nilamind_recent_tools", JSON.stringify([
      { target: "calm_hub", timestamp: Date.now() },
      { target: "diary", timestamp: Date.now() - 1000 },
      { target: "diary", timestamp: Date.now() - 2000 },
    ]));
    render(<ToolsScreen {...props} />);
    await waitFor(() => {
      expect(screen.getByText(TOOL_META.calm_hub.label())).toBeTruthy();
    });
    expect(screen.queryByRole("heading", { name: "Pinned" })).toBeNull();
    for (const id of ["calm_hub", "diary", "skills_hub"]) {
      expect(screen.getAllByText(TOOL_META[id].label()).length, `${id} rendered more than once`).toBe(1);
    }
  });

  it("does not render a search bar", async () => {
    render(<ToolsScreen {...props} />);
    await waitFor(() => {
      expect(screen.queryByLabelText("Search tools")).toBeNull();
    });
  });
});

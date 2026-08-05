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

describe("ToolsScreen", () => {
  const props = { go: vi.fn(), onEpisode: vi.fn(), phoneEnabled: false, onOpenCrisis: vi.fn() };

  it("renders the hub header", () => {
    render(<ToolsScreen {...props} />);
    expect(screen.getByRole("heading", { name: "Tools", level: 1 })).toBeTruthy();
  });

  it("renders all 3 sections: Calm, Track, Skills", () => {
    render(<ToolsScreen {...props} />);
    expect(screen.getByRole("heading", { name: "Calm" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Track" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Skills" })).toBeTruthy();
  });

  it("renders correct number of tools in Calm section", () => {
    render(<ToolsScreen {...props} />);
    // Calm: plan (Grounding & breathing), breathing, winddown, sounds, reach_out = 5
    const calmSection = screen.getByRole("heading", { name: "Calm" }).closest("section")!;
    const calmRows = calmSection.querySelectorAll("button");
    expect(calmRows.length).toBe(5);
  });

  it("renders correct number of tools in Track section", () => {
    render(<ToolsScreen {...props} />);
    // Track: ema_checkin, diary, dbt_diary_card, medication = 4
    const trackSection = screen.getByRole("heading", { name: "Track" }).closest("section")!;
    const trackRows = trackSection.querySelectorAll("button");
    expect(trackRows.length).toBe(4);
  });

  it("renders correct number of tools in Skills section", () => {
    render(<ToolsScreen {...props} />);
    // Skills: problem_solving, values_to_action, assessment, social_rhythm, exposure, relapse_plan, chain_analysis = 7
    const skillsSection = screen.getByRole("heading", { name: "Skills" }).closest("section")!;
    const skillRows = skillsSection.querySelectorAll("button");
    expect(skillRows.length).toBe(7);
  });

  it("each tool row is tappable and calls go with the right target", () => {
    render(<ToolsScreen {...props} />);
    // Check a representative from each section
    fireEvent.click(screen.getByText("Grounding & breathing"));
    expect(props.go).toHaveBeenCalledWith("plan");

    fireEvent.click(screen.getByText("Journal"));
    expect(props.go).toHaveBeenCalledWith("diary");

    fireEvent.click(screen.getByText("Problem-solving"));
    expect(props.go).toHaveBeenCalledWith("problem_solving");
  });

  it("does not render a crisis button at the bottom", () => {
    render(<ToolsScreen {...props} />);
    // The old design had CrisisHeaderButton at the bottom — now removed
    expect(screen.queryByLabelText("Crisis resources")).toBeNull();
  });

  it("does not render a search bar", () => {
    render(<ToolsScreen {...props} />);
    expect(screen.queryByLabelText("Search tools")).toBeNull();
  });
});

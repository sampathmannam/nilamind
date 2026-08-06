// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// Working in-memory secureLocal so the safety-gate save→persist→recompute flow is exercised for real.
const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  SENSITIVE_KEYS: [],
  flush: () => {},
}));

// Phase F: mock elevationGuard so TIPPTool tests exercise the UI, not elevation detection.
vi.mock("../services/elevationGuard", () => ({
  detectElevationRisk: () => ({ level: "none", markers: [] }),
  energyElevationSignal: () => "none",
  napElevationSignal: () => "none",
}));

import TIPPTool from "./TIPPTool";
import { saveTippSafetyFlags, defaultTippSafetyFlags } from "../services/tippSafetyGate";

afterEach(cleanup);
beforeEach(() => store.clear());

describe("TIPPTool — safety-gate entry checklist", () => {
  it("shows the one-time safety checklist before the tabs, on first open", () => {
    render(<TIPPTool />);
    expect(screen.getByText(/cardiac arrhythmia/i)).toBeTruthy();
    expect(screen.getByText(/pregnant/i)).toBeTruthy();
    // Tabs are not shown until the checklist is submitted.
    expect(screen.queryByRole("tab", { name: /Temperature/i })).toBeNull();
  });

  it("skips the checklist on a later mount once it was already completed (persisted)", () => {
    saveTippSafetyFlags(defaultTippSafetyFlags());
    render(<TIPPTool />);
    expect(screen.queryByText(/cardiac arrhythmia/i)).toBeNull();
    expect(screen.getByRole("tab", { name: /Temperature/i })).toBeTruthy();
  });

  it("submitting the checklist with nothing checked keeps Temperature visible and opens on Temperature", () => {
    render(<TIPPTool />);
    fireEvent.click(screen.getByText(/^continue$/i));
    expect(screen.getByRole("tab", { name: /Temperature/i, selected: true })).toBeTruthy();
  });

  it("checking any safety box hides the Temperature tab and defaults to Intense exercise, with inline copy", () => {
    render(<TIPPTool />);
    fireEvent.click(screen.getByLabelText(/pregnant/i));
    fireEvent.click(screen.getByText(/^continue$/i));

    expect(screen.queryByRole("tab", { name: /Temperature/i })).toBeNull();
    expect(screen.getByRole("tab", { name: /Intense exercise/i, selected: true })).toBeTruthy();
    expect(screen.getByText(/cold water skipped for your safety/i)).toBeTruthy();
  });

  it("a previously-saved caution flag hides Temperature on a fresh mount too", () => {
    saveTippSafetyFlags({ ...defaultTippSafetyFlags(), cardiac: true });
    render(<TIPPTool />);
    expect(screen.queryByRole("tab", { name: /Temperature/i })).toBeNull();
    expect(screen.getByRole("tab", { name: /Intense exercise/i, selected: true })).toBeTruthy();
  });
});

describe("TIPPTool — 4-tab strip", () => {
  beforeEach(() => { saveTippSafetyFlags(defaultTippSafetyFlags()); });

  it("renders all 4 TIPP tabs when no safety caution applies", () => {
    render(<TIPPTool />);
    expect(screen.getByRole("tab", { name: /Temperature/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Intense exercise/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Paced breathing/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Paired muscle relaxation/i })).toBeTruthy();
  });

  it("switches tab content when a tab is clicked", () => {
    render(<TIPPTool />);
    fireEvent.click(screen.getByRole("tab", { name: /Paced breathing/i }));
    // BreathingTimer's pattern picker should now be visible.
    expect(screen.getByText("Cyclic sighing")).toBeTruthy();
  });

  it("mounts BreathingTimer defaulted to cyclicSighing on the Paced-breathing tab", () => {
    render(<TIPPTool />);
    fireEvent.click(screen.getByRole("tab", { name: /Paced breathing/i }));
    const cyclicBtn = screen.getByText("Cyclic sighing");
    expect(cyclicBtn.className).toMatch(/bg-accent\/20/); // selected
  });

  it("mounts PMRTimer on the Paired-muscle-relaxation tab", () => {
    render(<TIPPTool />);
    fireEvent.click(screen.getByRole("tab", { name: /Paired muscle relaxation/i }));
    expect(screen.getByText("Hands & forearms")).toBeTruthy();
  });

  it("Temperature tab renders a countdown ring with cardiac-caution copy", () => {
    render(<TIPPTool />);
    fireEvent.click(screen.getByRole("tab", { name: /Temperature/i }));
    expect(screen.getByRole("img", { name: /cold/i })).toBeTruthy();
    expect(screen.getByText(/cardiac/i)).toBeTruthy();
  });

  it("Intense-exercise tab renders a countdown ring with a 60-90s duration", () => {
    render(<TIPPTool />);
    fireEvent.click(screen.getByRole("tab", { name: /Intense exercise/i }));
    expect(screen.getByText(/6[0-9]s remaining|[789][0-9]s remaining/i)).toBeTruthy();
  });

  it("shows the honesty-gap copy about no dismantling trial isolating one TIPP subskill", () => {
    render(<TIPPTool />);
    expect(screen.getByText(/no (single )?(study|trial|research)/i)).toBeTruthy();
  });
});

describe("TIPPTool — sub-skill completion (manual 'tried it' mark, per spec's checkmark-once-tried nav)", () => {
  beforeEach(() => { saveTippSafetyFlags(defaultTippSafetyFlags()); });

  it("marking Temperature as tried calls onSubSkillComplete('temperature') and shows a 1-10 intensity recheck grid", () => {
    const onSubSkillComplete = vi.fn();
    render(<TIPPTool onSubSkillComplete={onSubSkillComplete} />);
    fireEvent.click(screen.getByRole("tab", { name: /Temperature/i }));
    fireEvent.click(screen.getByText(/mark as tried/i));
    expect(onSubSkillComplete).toHaveBeenCalledWith("temperature");
    expect(screen.getByText(/intensity/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "7" })).toBeTruthy();
  });

  it("marking Intense exercise as tried calls onSubSkillComplete('exercise')", () => {
    const onSubSkillComplete = vi.fn();
    render(<TIPPTool onSubSkillComplete={onSubSkillComplete} />);
    fireEvent.click(screen.getByRole("tab", { name: /Intense exercise/i }));
    fireEvent.click(screen.getByText(/mark as tried/i));
    expect(onSubSkillComplete).toHaveBeenCalledWith("exercise");
  });

  it("marking Paced breathing as tried calls onSubSkillComplete('breathing')", () => {
    const onSubSkillComplete = vi.fn();
    render(<TIPPTool onSubSkillComplete={onSubSkillComplete} />);
    fireEvent.click(screen.getByRole("tab", { name: /Paced breathing/i }));
    fireEvent.click(screen.getByText(/mark as tried/i));
    expect(onSubSkillComplete).toHaveBeenCalledWith("breathing");
  });

  it("marking Paired muscle relaxation as tried calls onSubSkillComplete('pmr')", () => {
    const onSubSkillComplete = vi.fn();
    render(<TIPPTool onSubSkillComplete={onSubSkillComplete} />);
    fireEvent.click(screen.getByRole("tab", { name: /Paired muscle relaxation/i }));
    fireEvent.click(screen.getByText(/mark as tried/i));
    expect(onSubSkillComplete).toHaveBeenCalledWith("pmr");
  });

  it("a tried sub-skill shows a checkmark on its tab", () => {
    render(<TIPPTool />);
    fireEvent.click(screen.getByRole("tab", { name: /Paired muscle relaxation/i }));
    fireEvent.click(screen.getByText(/mark as tried/i));
    const tab = screen.getByRole("tab", { name: /Paired muscle relaxation/i });
    expect(tab.querySelector("svg")).toBeTruthy(); // CheckCircle2 icon rendered on the tried tab
  });

  it("recording an intensity recheck calls onIntensityChange with the picked value", () => {
    const onIntensityChange = vi.fn();
    render(<TIPPTool onIntensityChange={onIntensityChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /Temperature/i }));
    fireEvent.click(screen.getByText(/mark as tried/i));
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    expect(onIntensityChange).toHaveBeenCalledWith(4);
  });

  it("does not throw when onSubSkillComplete/onIntensityChange are omitted", () => {
    render(<TIPPTool />);
    fireEvent.click(screen.getByRole("tab", { name: /Temperature/i }));
    expect(() => fireEvent.click(screen.getByText(/mark as tried/i))).not.toThrow();
  });
});

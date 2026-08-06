// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

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

import BreathingScreen from "./BreathingScreen";
import { GROUNDING_EXERCISES } from "../data";
import { saveTippSafetyFlags, defaultTippSafetyFlags } from "../services/tippSafetyGate";

afterEach(cleanup);
beforeEach(() => store.clear());

describe("BreathingScreen — unified tabbed interface", () => {
  it("renders the three tab buttons: Breathe, Ground, TIPP", () => {
    render(<BreathingScreen onClose={() => {}} />);
    expect(screen.getByRole("tab", { name: /Breathe/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Ground/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /TIPP/i })).toBeTruthy();
  });

  it("opens on the Breathe tab by default", () => {
    render(<BreathingScreen onClose={() => {}} />);
    expect(screen.getByRole("tab", { name: /Breathe/i }).getAttribute("aria-selected")).toBe("true");
  });

  it("opens on the Ground tab when defaultTab is 'ground'", () => {
    render(<BreathingScreen onClose={() => {}} defaultTab="ground" />);
    expect(screen.getByRole("tab", { name: /Ground/i }).getAttribute("aria-selected")).toBe("true");
  });

  it("opens on the TIPP tab when defaultTab is 'tipp'", () => {
    saveTippSafetyFlags(defaultTippSafetyFlags());
    render(<BreathingScreen onClose={() => {}} defaultTab="tipp" />);
    expect(screen.getByRole("tab", { name: /TIPP/i }).getAttribute("aria-selected")).toBe("true");
  });

  it("shows grounding exercises when Ground tab is selected", () => {
    render(<BreathingScreen onClose={() => {}} defaultTab="ground" />);
    expect(screen.getByText("Somatic anchors — 100% offline-ready")).toBeTruthy();
    for (const ex of GROUNDING_EXERCISES) {
      expect(screen.getByText(ex.title)).toBeTruthy();
    }
  });

  it("shows TIPP tool when TIPP tab is selected", () => {
    saveTippSafetyFlags(defaultTippSafetyFlags());
    render(<BreathingScreen onClose={() => {}} defaultTab="tipp" />);
    expect(screen.getByText(/Each piece here is backed by real research/)).toBeTruthy();
  });

  it("can expand a grounding exercise card", () => {
    render(<BreathingScreen onClose={() => {}} defaultTab="ground" />);
    const firstExercise = GROUNDING_EXERCISES[0];
    const openButton = screen.getByText(firstExercise.title).closest("button")!;
    fireEvent.click(openButton);
    expect(screen.getByText(firstExercise.steps)).toBeTruthy();
  });
});

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

import GroundingLibraryScreen from "./GroundingLibraryScreen";
import { GROUNDING_EXERCISES } from "../data";
import { saveTippSafetyFlags, defaultTippSafetyFlags } from "../services/tippSafetyGate";

afterEach(cleanup);
beforeEach(() => store.clear());

// 2026-07-12 Wave 3, Group E — the "Cold Reset (TIPP)" card now mounts the unified interactive
// TIPPTool (was a static paragraph) — same consolidation that already special-cases Box Breathing.
describe("GroundingLibraryScreen — TIPP consolidation", () => {
  it("mounts the interactive TIPPTool when the Cold Reset (TIPP) card is expanded", () => {
    saveTippSafetyFlags(defaultTippSafetyFlags());
    const tippIndex = GROUNDING_EXERCISES.findIndex((e) => e.title === "Cold Reset (TIPP)");
    render(<GroundingLibraryScreen autoExpand={tippIndex} />);
    expect(screen.getByRole("tab", { name: /Temperature/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Paired muscle relaxation/i })).toBeTruthy();
  });

  it("still mounts BreathingTimer for the Box Breathing card unmodified (zero regression)", () => {
    const boxIndex = GROUNDING_EXERCISES.findIndex((e) => e.title === "Box Breathing");
    render(<GroundingLibraryScreen autoExpand={boxIndex} />);
    expect(screen.getByText("Cyclic sighing")).toBeTruthy(); // BreathingTimer's pattern picker
    expect(screen.queryByRole("tab")).toBeNull(); // not the TIPP tool
  });

  it("other cards still render plain static steps text, no interactive tool", () => {
    const scanIndex = GROUNDING_EXERCISES.findIndex((e) => e.title === "Body Scan");
    render(<GroundingLibraryScreen autoExpand={scanIndex} />);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText(/Start at your feet/i)).toBeTruthy();
  });
});

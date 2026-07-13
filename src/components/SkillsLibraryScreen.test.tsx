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

import SkillsLibraryScreen from "./SkillsLibraryScreen";
import { saveTippSafetyFlags, defaultTippSafetyFlags } from "../services/tippSafetyGate";

// jsdom doesn't implement scrollIntoView — the screen calls it to scroll a focused/expanded skill into view.
beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
beforeEach(() => store.clear());

// 2026-07-12 Wave 3, Group E — opening the TIPP skill card mounts the unified interactive TIPPTool
// (skillsLibrary.ts's `interactive: true` flag), instead of the old shallow static steps list.
describe("SkillsLibraryScreen — TIPP consolidation", () => {
  it("mounts TIPPTool when the TIPP skill card is expanded", () => {
    saveTippSafetyFlags(defaultTippSafetyFlags());
    render(<SkillsLibraryScreen focusSkillId="tipp" />);
    expect(screen.getByRole("tab", { name: /Temperature/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Paired muscle relaxation/i })).toBeTruthy();
  });

  it("a non-interactive skill (e.g. STOP) still renders the plain numbered steps list", () => {
    render(<SkillsLibraryScreen focusSkillId="stop" />);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText(/freeze, don't move or react/i)).toBeTruthy();
  });
});

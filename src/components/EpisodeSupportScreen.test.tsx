// @vitest-environment jsdom
// 2026-07-12 Wave 3, Group E — EpisodeSupportScreen's offline-guided extreme-intensity path
// (formerly extreme_tipp_1/2/3, a static-text T→I→P walkthrough that entirely omitted Paired Muscle
// Relaxation) now mounts the unified interactive TIPPTool, closing that gap. Sub-skill completion logs
// into the existing debrief skillsSelected checklist ("TIPP" is already a valid diary entry).
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  appendToSecureArray: vi.fn(),
  SENSITIVE_KEYS: [],
  flush: () => {},
}));

vi.mock("../services/crisisClassifier", () => ({
  detectCrisis: async () => false,
}));

vi.mock("../services/nilaSessions", () => ({
  logNilaTurn: vi.fn(),
}));

const sendToNilaMock = vi.fn();
vi.mock("../services/sendToNila", () => ({
  sendToNila: (...args: unknown[]) => sendToNilaMock(...args),
}));

import EpisodeSupportScreen from "./EpisodeSupportScreen";
import { saveTippSafetyFlags, defaultTippSafetyFlags } from "../services/tippSafetyGate";

afterEach(cleanup);
beforeEach(() => {
  store.clear();
  sendToNilaMock.mockReset();
  saveTippSafetyFlags(defaultTippSafetyFlags());
});

async function startAndReachOfflineGuided(intensity: number) {
  sendToNilaMock.mockResolvedValue({ reply: "", reachedAI: false, blocked: false });
  render(
    <EpisodeSupportScreen
      onSessionEnded={() => {}}
      onNavigateToGrounding={() => {}}
      onNavigateToBreathing={() => {}}
    />
  );
  fireEvent.change(screen.getByLabelText("Message Nila"), { target: { value: "I feel awful" } });
  fireEvent.click(screen.getByText("Start Episode Support"));
  await waitFor(() => expect(screen.getByText(/how intense/i)).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "8" }));
  await waitFor(() => expect(screen.getByText(/isn't reachable/i)).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: String(intensity) }));
}

describe("EpisodeSupportScreen — offline-guided extreme path mounts TIPPTool", () => {
  it("mounts the full 4-tab interactive TIPP tool (T·I·P·P) for an 8-10 intensity report, no longer skipping PMR", async () => {
    await startAndReachOfflineGuided(9);
    expect(screen.getByRole("tab", { name: /Temperature/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Intense exercise/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Paced breathing/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Paired muscle relaxation/i })).toBeTruthy();
  });

  it("marking a TIPP sub-skill as tried adds 'TIPP' to the debrief skillsSelected checklist", async () => {
    await startAndReachOfflineGuided(9);
    fireEvent.click(screen.getByRole("tab", { name: /Paired muscle relaxation/i }));
    fireEvent.click(screen.getByText(/mark as tried/i));

    // Continue to the debrief screens.
    fireEvent.click(screen.getByText(/ready to close out/i));
    fireEvent.click(screen.getByText("Skip")); // debrief_1 trigger explanation, optional

    // debrief_2's skill checklist should already show TIPP checked.
    const tippChip = screen.getByText("TIPP").closest("button")!;
    expect(tippChip.className).toMatch(/emerald/);
  });
});

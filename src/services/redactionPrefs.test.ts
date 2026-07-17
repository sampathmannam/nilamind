import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import {
  getRedactionPrefs,
  setRedactionPrefs,
  PRESET_MINIMAL,
  PRESET_FULL,
  categoryKeys,
  type RedactionPrefs,
} from "./redactionPrefs";

describe("redactionPrefs (Phase 20.2)", () => {
  beforeEach(() => { store.clear(); });

  it("returns FULL preset by default when no prefs stored", () => {
    const prefs = getRedactionPrefs();
    expect(prefs).toEqual(PRESET_FULL);
  });

  it("returns MINIMAL preset via preset helper", () => {
    const prefs = PRESET_MINIMAL;
    expect(prefs.checkins).toBe(false);
    expect(prefs.sleep).toBe(false);
    expect(prefs.screenings).toBe(true);
    expect(prefs.medications).toBe(false);
    expect(prefs.episodes).toBe(false);
    expect(prefs.phaseMarkers).toBe(false);
    expect(prefs.diaryCard).toBe(false);
    expect(prefs.thoughtRecords).toBe(false);
    expect(prefs.safetyPlan).toBe(true);
    expect(prefs.relapsePlan).toBe(false);
    expect(prefs.connections).toBe(false);
    expect(prefs.supports).toBe(false);
    expect(prefs.voiceSignal).toBe(false);
    expect(prefs.behaviouralInsights).toBe(false);
  });

  it("FULL preset has all categories enabled", () => {
    const prefs = PRESET_FULL;
    expect(prefs.checkins).toBe(true);
    expect(prefs.sleep).toBe(true);
    expect(prefs.screenings).toBe(true);
    expect(prefs.medications).toBe(true);
    expect(prefs.episodes).toBe(true);
    expect(prefs.phaseMarkers).toBe(true);
    expect(prefs.diaryCard).toBe(true);
    expect(prefs.thoughtRecords).toBe(true);
    expect(prefs.safetyPlan).toBe(true);
    expect(prefs.relapsePlan).toBe(true);
    expect(prefs.connections).toBe(true);
    expect(prefs.supports).toBe(true);
    expect(prefs.voiceSignal).toBe(true);
    expect(prefs.behaviouralInsights).toBe(true);
  });

  it("setRedactionPrefs persists and getRedactionPrefs retrieves", () => {
    const custom: RedactionPrefs = { ...PRESET_FULL, sleep: false, episodes: false };
    setRedactionPrefs(custom);
    const loaded = getRedactionPrefs();
    expect(loaded.sleep).toBe(false);
    expect(loaded.episodes).toBe(false);
    expect(loaded.checkins).toBe(true);
  });

  it("returns FULL preset when stored data is corrupted", () => {
    store.set("nilamind_redaction_prefs", "{invalid json");
    const prefs = getRedactionPrefs();
    expect(prefs).toEqual(PRESET_FULL);
  });

  it("categoryKeys returns all category names", () => {
    expect(categoryKeys.length).toBeGreaterThan(10);
    expect(categoryKeys).toContain("checkins");
    expect(categoryKeys).toContain("medications");
  });
});

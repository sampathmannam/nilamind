// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// jsdom in this repo's vitest setup doesn't provide a real localStorage global (see
// crisisResources.test.ts convention) — mock the storage seam crisisResources reads through instead.
const store = new Map<string, string>();
vi.mock("../../services/storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  }),
  DAY_MS: 86_400_000,
}));

import RegionSection from "./RegionSection";
import { getRegionCode } from "../../services/crisisResources";

afterEach(cleanup);
beforeEach(() => {
  store.clear();
});

// 2026-07-12 device-QA: CrisisOverlay and onboarding both say "change in Settings" but no such control
// existed — a non-India user was stuck with India-only lines. Service layer (crisisResources) was already
// built + tested; this pins the missing UI.
describe("RegionSection (2026-07-12: crisis screen promised 'change in Settings' — control didn't exist)", () => {
  it("renders one option per region including International", () => {
    render(<RegionSection />);
    expect(screen.getByText(/india/i)).toBeTruthy();
    expect(screen.getByText(/international/i)).toBeTruthy();
  });

  it("changing region persists it and updates the preview lines", () => {
    render(<RegionSection />);
    fireEvent.change(screen.getByLabelText(/region/i), { target: { value: "US" } });
    expect(getRegionCode()).toBe("US");
    expect(screen.getAllByText(/988/).length).toBeGreaterThan(0); // US lifeline appears in preview
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string>;
vi.mock("../services/storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  }),
  DAY_MS: 86_400_000,
}));

import { render, screen } from "@testing-library/react";
import React from "react";
import AgencyNarrative from "./AgencyNarrative";

// @vitest-environment jsdom

beforeEach(() => {
  document.body.innerHTML = "";
  store = {};
});

describe("AgencyNarrative", () => {
  it("shows goal linkage with insight arrow", () => {
    render(<AgencyNarrative goal="stress management" />);
    expect(screen.getByText(/stress management/)).toBeTruthy();
    expect(screen.getByText(/generated pattern insight/)).toBeTruthy();
  });

  it("renders progress bar", () => {
    render(<AgencyNarrative goal="test" />);
    expect(screen.getByRole("progressbar")).toBeTruthy();
    const progress = screen.getByRole("progressbar") as HTMLElement;
    expect(progress.style.width).toBe("42%");
    expect(screen.getByText(/Progress:/)).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string>;
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));

import { render, screen } from "@testing-library/react";
import React from "react";
import AffectToneStrip from "./AffectToneStrip";
import { setAffectAccentPersistenceEnabled, noteChatAffect } from "../services/chatAffect";

// @vitest-environment jsdom

beforeEach(() => {
  document.body.innerHTML = "";
  store = {};
  setAffectAccentPersistenceEnabled(false);
});

describe("AffectToneStrip", () => {
  it("renders the empty state when below the floor", () => {
    render(<AffectToneStrip />);
    expect(screen.getByText("Conversation tone (automatic)")).toBeTruthy();
    expect(screen.getByText("No data yet.")).toBeTruthy();
  });

  it("renders 30 dots and the attribution caption once the floor clears", () => {
    setAffectAccentPersistenceEnabled(true);
    const now = Date.now();
    for (let d = 0; d < 9; d++) {
      const ts = now - d * 86400000;
      noteChatAffect({ valence: -0.5, arousal: 0 }, ts);
      noteChatAffect({ valence: -0.5, arousal: 0 }, ts);
    }
    const { container } = render(<AffectToneStrip />);
    expect(container.querySelectorAll(".rounded-full").length).toBe(30);
    expect(screen.getByText(/not something you told the app/)).toBeTruthy();
  });
});

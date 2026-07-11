// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// Working in-memory secureLocal so the save→persist→recompute flow is exercised for real.
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
vi.mock("../hooks/useHaptics", () => ({ hapticLight: vi.fn() }));

import SocialRhythmScreen from "./SocialRhythmScreen";
import { loadRhythm } from "../services/socialRhythm";

afterEach(cleanup);
beforeEach(() => store.clear());

describe("SocialRhythmScreen", () => {
  it("renders the anchors, the honest IPSRT basis, and the 'keep logging' state when empty", () => {
    render(<SocialRhythmScreen />);
    expect(screen.getByText("Social rhythm")).toBeTruthy();
    expect(screen.getByLabelText("Out of bed")).toBeTruthy();
    expect(screen.getByLabelText("To bed")).toBeTruthy();
    expect(screen.getByText(/keep logging/i)).toBeTruthy(); // insufficient state (0 days)
    expect(screen.getByText(/Social Rhythm Metric \(Monk/i)).toBeTruthy(); // cited basis + honest limit
  });

  it("saves today's anchors on tap (persisted on-device) and reflects the saved state", () => {
    render(<SocialRhythmScreen />);
    fireEvent.change(screen.getByLabelText("Out of bed"), { target: { value: "07:00" } });
    fireEvent.change(screen.getByLabelText("To bed"), { target: { value: "23:00" } });
    fireEvent.click(screen.getByText(/save today's rhythm/i));

    const saved = loadRhythm();
    expect(saved).toHaveLength(1);
    expect(saved[0].anchors.wake).toBe("07:00");
    expect(saved[0].anchors.bed).toBe("23:00");
    expect(screen.getByText(/^Saved$/)).toBeTruthy(); // button flips to "Saved"
  });
});

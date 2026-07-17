// @vitest-environment jsdom
import { localDateKey } from "../services/storageUtils";
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
import { loadRhythm, recordRhythm } from "../services/socialRhythm";

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

  it("surfaces a wake-time-lever insight (Frank et al. 2005; Monk et al. 2002) after saving, once enough rhythm+sleep data exists", () => {
    const now = new Date();
    const dayMs = 86_400_000;
    // 5 prior days of a variable wake anchor + check-in sleep hours, so both computeRhythmRegularity
    // (needs >=MIN_RHYTHM_DAYS) and computeCircadianFeedback (needs >=3 sleep readings) have data.
    const wakeTimes = ["06:00", "09:30", "07:15", "10:00", "06:45"];
    const checkins: Array<{ date: string; sleepHours: number }> = [];
    for (let i = 5; i >= 1; i--) {
      const d = new Date(now.getTime() - i * dayMs);
      recordRhythm({ wake: wakeTimes[5 - i] }, d);
      checkins.push({ date: localDateKey(d), sleepHours: 6 + (i % 2) });
    }
    store.set("nilamind_checkins", JSON.stringify(checkins));

    render(<SocialRhythmScreen />);
    fireEvent.change(screen.getByLabelText("Out of bed"), { target: { value: "08:00" } });
    fireEvent.click(screen.getByText(/save today's rhythm/i));

    expect(screen.getByText(/wake-time insight/i)).toBeTruthy();
    expect(screen.getByText(/Monk, Frank, Potts & Kupfer, 2002/)).toBeTruthy();
  });

  it("does not show the wake-time insight before saving or without enough data", () => {
    render(<SocialRhythmScreen />);
    expect(screen.queryByText(/wake-time insight/i)).toBeNull();
  });
});

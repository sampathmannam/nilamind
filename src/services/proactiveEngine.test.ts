import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string>;
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
}));
// Isolate the circadian signal so we control the rhythm score directly.
vi.mock("./circadianFeedback", () => ({
  currentCircadianFeedback: vi.fn(() => ({ combinedScore: 80, needsAttention: false } as any)),
}));
// Keep other moments quiet so the rhythm moment is the only candidate.
vi.mock("./sleepInsight", () => ({ selfReportSleepSignal: () => ({ firing: false }) }));
vi.mock("./checkin", () => ({ hasCheckinToday: () => true, getSkipFlag: () => "" }));

import { computeProactiveMoment, dismissProactive } from "./proactiveEngine";
import { currentCircadianFeedback } from "./circadianFeedback";

const today = () => new Date().toISOString().split("T")[0];
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

beforeEach(() => {
  store = {};
  store["nilamind_checkins"] = JSON.stringify([{ date: today(), emotion: "ok", intensity: 3 }]);
  vi.setSystemTime(new Date("2026-07-13T14:00:00")); // Monday 2pm — outside all hour-gated moments
  (currentCircadianFeedback as any).mockReturnValue({ combinedScore: 80, needsAttention: false });
});

describe("proactiveEngine — P8.3 rhythm disruption alert", () => {
  it("offers the wind-down protocol after 3+ consecutive low-rhythm days", () => {
    store["nilamind_rhythm_low_streak"] = JSON.stringify({ date: today(), streak: 3 });
    (currentCircadianFeedback as any).mockReturnValue({ combinedScore: 50, needsAttention: true });
    const moment = computeProactiveMoment();
    expect(moment?.trigger).toBe("rhythm_drop");
    expect(moment?.card.kind).toBe("protocol");
    expect((moment?.card as any).protocolId).toBe("sleep-wind-down");
  });

  it("does NOT offer when the low-rhythm streak is below 3", () => {
    store["nilamind_rhythm_low_streak"] = JSON.stringify({ date: today(), streak: 1 });
    (currentCircadianFeedback as any).mockReturnValue({ combinedScore: 50, needsAttention: true });
    expect(computeProactiveMoment()).toBeNull();
  });

  it("resets the streak on a healthy-rhythm day", () => {
    store["nilamind_rhythm_low_streak"] = JSON.stringify({ date: yesterday(), streak: 3 });
    (currentCircadianFeedback as any).mockReturnValue({ combinedScore: 85, needsAttention: false });
    expect(computeProactiveMoment()).toBeNull();
    const saved = JSON.parse(store["nilamind_rhythm_low_streak"]);
    expect(saved.streak).toBe(0);
    expect(saved.date).toBe(today());
  });

  it("increments the streak when a new low day follows a prior low streak", () => {
    store["nilamind_rhythm_low_streak"] = JSON.stringify({ date: yesterday(), streak: 2 });
    (currentCircadianFeedback as any).mockReturnValue({ combinedScore: 55, needsAttention: true });
    const moment = computeProactiveMoment();
    expect(moment?.trigger).toBe("rhythm_drop");
    const saved = JSON.parse(store["nilamind_rhythm_low_streak"]);
    expect(saved.streak).toBe(3);
  });

  it("respects dismissal (24h+ cooldown keyed by dismiss)", () => {
    store["nilamind_rhythm_low_streak"] = JSON.stringify({ date: today(), streak: 3 });
    (currentCircadianFeedback as any).mockReturnValue({ combinedScore: 50, needsAttention: true });
    expect(computeProactiveMoment()?.trigger).toBe("rhythm_drop");
    dismissProactive("rhythm_drop");
    expect(computeProactiveMoment()).toBeNull();
  });
});

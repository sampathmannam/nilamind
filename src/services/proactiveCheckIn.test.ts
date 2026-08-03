import { vi, describe, it, expect, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

vi.mock("./moodHistory", () => ({ loadMoodHistory: vi.fn(() => []) }));
vi.mock("./sleepInsight", () => ({ selfReportSleepSignal: vi.fn(() => null) }));
vi.mock("./streaks", () => ({
  computeCompassionateStreak: vi.fn(() => ({
    current: 0,
    longest: 0,
    activeToday: false,
    totalActiveDays: 0,
    freezesUsed: 0,
    freezesLeft: 2,
    lapsed: false,
    milestone: null,
  })),
}));
vi.mock("./nilaVoice", () => ({
  buildNilaMessage: vi.fn(() => ({ message: "Hey, how are you doing?" })),
}));

import { recordProactiveCheckIn, checkProactiveCheckIn } from "./proactiveCheckIn";
import { computeCompassionateStreak } from "./streaks";
import { selfReportSleepSignal } from "./sleepInsight";

beforeEach(() => {
  store.clear();
  vi.mocked(computeCompassionateStreak).mockReturnValue({
    current: 0,
    longest: 0,
    activeToday: false,
    totalActiveDays: 0,
    freezesUsed: 0,
    freezesLeft: 2,
    daysSinceLast: 1,
    lapsed: false,
    milestone: null,
    message: "",
    emoji: "",
  });
  vi.mocked(selfReportSleepSignal).mockReturnValue(null);
});

describe("proactiveCheckIn", () => {
  describe("recordProactiveCheckIn", () => {
    it("stores a timestamp", () => {
      recordProactiveCheckIn();
      const raw = store.get("nilamind_last_proactive_checkin");
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw!);
      expect(typeof parsed.timestamp).toBe("number");
      expect(parsed.timestamp).toBeGreaterThan(0);
    });
  });

  describe("checkProactiveCheckIn", () => {
    it("returns null when no signals fire and no history", () => {
      expect(checkProactiveCheckIn()).toBeNull();
    });

    it("returns null when checked in within the last 4 hours", () => {
      const recent = JSON.stringify({ timestamp: Date.now() });
      store.set("nilamind_last_proactive_checkin", recent);
      expect(checkProactiveCheckIn()).toBeNull();
    });

    it("allows check-in after 4-hour cooldown", () => {
      const old = JSON.stringify({ timestamp: Date.now() - 5 * 60 * 60 * 1000 });
      store.set("nilamind_last_proactive_checkin", old);
      expect(checkProactiveCheckIn()).toBeNull();
    });

    it("returns ProactiveCheckIn with shouldShow when returning after absence", () => {
      vi.mocked(computeCompassionateStreak).mockReturnValue({
        current: 0,
        longest: 0,
        activeToday: false,
        totalActiveDays: 0,
        freezesUsed: 0,
        freezesLeft: 2,
        lapsed: true,
        daysSinceLast: 3,
        milestone: null,
        message: "",
        emoji: "",
      });
      const result = checkProactiveCheckIn();
      expect(result).not.toBeNull();
      expect(result!.shouldShow).toBe(true);
      expect(result!.scenario).toBe("returning_after_absence");
    });

    it("returns ProactiveCheckIn when short sleep signal fires", () => {
      vi.mocked(selfReportSleepSignal).mockReturnValue({ firing: true } as any);
      const result = checkProactiveCheckIn();
      expect(result).not.toBeNull();
      expect(result!.shouldShow).toBe(true);
      expect(result!.scenario).toBe("sleep_short");
    });

    it("returns ProactiveCheckIn on streak milestone", () => {
      vi.mocked(computeCompassionateStreak).mockReturnValue({
        current: 7,
        longest: 7,
        activeToday: true,
        totalActiveDays: 7,
        freezesUsed: 0,
        freezesLeft: 2,
        lapsed: false,
        daysSinceLast: 0,
        milestone: 7,
        message: "",
        emoji: "",
      });
      const result = checkProactiveCheckIn();
      expect(result).not.toBeNull();
      expect(result!.shouldShow).toBe(true);
      expect(result!.scenario).toBe("streak_milestone");
    });

    it("does not show when streak exists but no milestone", () => {
      vi.mocked(computeCompassionateStreak).mockReturnValue({
        current: 5,
        longest: 5,
        activeToday: true,
        totalActiveDays: 5,
        freezesUsed: 0,
        freezesLeft: 2,
        lapsed: false,
        daysSinceLast: 0,
        milestone: null,
        message: "",
        emoji: "",
      });
      expect(checkProactiveCheckIn()).toBeNull();
    });
  });
});

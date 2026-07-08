import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  appendToSecureArray: vi.fn((key: string, item: any) => {
    const arr = store.get(key) ? JSON.parse(store.get(key)!) : [];
    arr.push(item);
    store.set(key, JSON.stringify(arr));
  }),
}));

vi.mock("./moodHistory", () => ({
  loadMoodHistory: vi.fn(),
}));

import { loadMoodHistory } from "./moodHistory";
import { recordProtocolCompletion, computeNof1Ranking, bestProtocolForUser } from "./nOf1";

function mood(seed: { date: string; intensity: number }[]) {
  return seed.map((s) => ({ date: s.date, intensity: s.intensity }));
}

describe("nOf1 protocol testing", () => {
  beforeEach(() => { store.clear(); });

  it("records a completion pulling same/next-day distress from check-ins", () => {
    (loadMoodHistory as any).mockReturnValue(mood([
      { date: "2026-07-01", intensity: 7 },
      { date: "2026-07-02", intensity: 4 },
    ]));
    const rec = recordProtocolCompletion("self-compassion", "2026-07-01");
    expect(rec.distressSameDay).toBe(7);
    expect(rec.distressNextDay).toBe(4);
  });

  it("ranks protocols by improvement (most negative delta first)", () => {
    (loadMoodHistory as any).mockReturnValue(mood([
      { date: "2026-07-01", intensity: 8 }, { date: "2026-07-02", intensity: 3 }, // self-compassion: -5
      { date: "2026-07-03", intensity: 8 }, { date: "2026-07-04", intensity: 2 }, // self-compassion: -6
      { date: "2026-07-05", intensity: 4 }, { date: "2026-07-06", intensity: 6 }, // ba: +2
      { date: "2026-07-07", intensity: 4 }, { date: "2026-07-08", intensity: 7 }, // ba: +3
    ]));
    recordProtocolCompletion("self-compassion", "2026-07-01");
    recordProtocolCompletion("self-compassion", "2026-07-03");
    recordProtocolCompletion("behaviour", "2026-07-05");
    recordProtocolCompletion("behaviour", "2026-07-07");
    const rank = computeNof1Ranking();
    expect(rank[0].protocolId).toBe("self-compassion");
    expect(rank[0].avgDelta).toBeLessThan(0);
    expect(bestProtocolForUser()).toBe("self-compassion");
  });

  it("needs at least 2 completions per protocol to rank", () => {
    (loadMoodHistory as any).mockReturnValue(mood([
      { date: "2026-07-01", intensity: 8 }, { date: "2026-07-02", intensity: 3 },
    ]));
    recordProtocolCompletion("self-compassion", "2026-07-01");
    expect(computeNof1Ranking()).toHaveLength(0);
  });

  it("returns null best when no protocol improved distress", () => {
    (loadMoodHistory as any).mockReturnValue(mood([
      { date: "2026-07-01", intensity: 3 }, { date: "2026-07-02", intensity: 6 }, // +3
      { date: "2026-07-03", intensity: 3 }, { date: "2026-07-04", intensity: 7 }, // +4
    ]));
    recordProtocolCompletion("behaviour", "2026-07-01");
    recordProtocolCompletion("behaviour", "2026-07-03");
    expect(bestProtocolForUser()).toBeNull();
  });

  // audit 2.18: distressNextDay can't exist at completion time; it must be backfilled once tomorrow logs.
  it("backfills distressNextDay once the following day's check-in exists", () => {
    // Completions happen when only the SAME day's check-in exists (tomorrow hasn't happened).
    (loadMoodHistory as any).mockReturnValue(mood([{ date: "2026-07-01", intensity: 8 }]));
    const rec = recordProtocolCompletion("self-compassion", "2026-07-01");
    expect(rec.distressNextDay).toBeNull(); // the bug was this staying null forever

    (loadMoodHistory as any).mockReturnValue(mood([
      { date: "2026-07-01", intensity: 8 }, { date: "2026-07-03", intensity: 8 },
    ]));
    recordProtocolCompletion("self-compassion", "2026-07-03");

    // Ranking used to be permanently empty. Now, once the next-day check-ins are logged, it backfills.
    expect(computeNof1Ranking()).toHaveLength(0); // still nothing — next days not logged yet

    (loadMoodHistory as any).mockReturnValue(mood([
      { date: "2026-07-01", intensity: 8 }, { date: "2026-07-02", intensity: 3 },
      { date: "2026-07-03", intensity: 8 }, { date: "2026-07-04", intensity: 2 },
    ]));
    const rank = computeNof1Ranking();
    expect(rank).toHaveLength(1);
    expect(rank[0].protocolId).toBe("self-compassion");
    expect(rank[0].avgDelta).toBeLessThan(0); // distress dropped the day after — real data at last
  });
});

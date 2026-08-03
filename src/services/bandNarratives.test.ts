import { describe, it, expect, vi } from "vitest";

vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  },
}));

import { buildBandNarratives, type BandNarrativeInput } from "./bandNarratives";

function makeInput(overrides: Partial<BandNarrativeInput> = {}): BandNarrativeInput {
  return {
    activityMessage: "",
    monthlyWord: null,
    behaviourCount: 0,
    proactiveCount: 0,
    moodSummary: "",
    signalCount: 0,
    episodeCount: 0,
    sessionCount: 0,
    lang: "en",
    ...overrides,
  };
}

describe("bandNarratives", () => {
  it("buildBandNarratives with minimal (empty) input — computed fields are non-empty", () => {
    const result = buildBandNarratives(makeInput());
    expect(typeof result.activity).toBe("string");
    expect(typeof result.tracking).toBe("string");
    expect(typeof result.signals).toBe("string");
    expect(typeof result.trends).toBe("string");
    expect(typeof result.episodes).toBe("string");
    expect(result.tracking.length).toBeGreaterThan(0);
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.episodes.length).toBeGreaterThan(0);
  });

  it("buildBandNarratives with full input — all 5 fields are non-empty strings", () => {
    const result = buildBandNarratives(
      makeInput({
        activityMessage: "You walked 3k steps today",
        monthlyWord: "resilience",
        behaviourCount: 2,
        proactiveCount: 1,
        moodSummary: "Mood trending upward this week",
        signalCount: 3,
        episodeCount: 1,
        sessionCount: 5,
      }),
    );
    expect(result.activity.length).toBeGreaterThan(0);
    expect(result.tracking.length).toBeGreaterThan(0);
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.trends.length).toBeGreaterThan(0);
    expect(result.episodes.length).toBeGreaterThan(0);
  });

  it("activity mirrors the input activityMessage", () => {
    const msg = "Practiced breathing for 10 min";
    const result = buildBandNarratives(makeInput({ activityMessage: msg }));
    expect(result.activity).toBe(msg);
  });

  it("trends mirrors the input moodSummary", () => {
    const summary = "Stable mood across 5 days";
    const result = buildBandNarratives(makeInput({ moodSummary: summary }));
    expect(result.trends).toBe(summary);
  });

  it("signals text changes with signalCount", () => {
    const zero = buildBandNarratives(makeInput({ signalCount: 0 }));
    const one = buildBandNarratives(makeInput({ signalCount: 1 }));
    const many = buildBandNarratives(makeInput({ signalCount: 4 }));
    expect(zero.signals).not.toBe(one.signals);
    expect(one.signals).not.toBe(many.signals);
  });

  it("episodes text changes with episodeCount and sessionCount", () => {
    const base = buildBandNarratives(makeInput({ episodeCount: 0, sessionCount: 0 }));
    const withEp = buildBandNarratives(makeInput({ episodeCount: 1, sessionCount: 1 }));
    expect(base.episodes).not.toBe(withEp.episodes);
  });
});

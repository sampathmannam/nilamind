import { describe, it, expect } from "vitest";
import { computeStateEstimate, stateEstimateContextBlock, type StateEstimateInputs } from "./stateEngine";
import type { BehaviourSnapshot } from "./phoneBehaviour";
import type { MoodPoint } from "./patternInsights";
import type { InflectionSignal } from "./nilaInflection";
import type { BAInsight } from "./behaviouralActivation";

function snap(overrides: Partial<BehaviourSnapshot> & { date: string }): BehaviourSnapshot {
  const { date, ...rest } = overrides;
  return {
    date,
    capturedAt: Date.now(),
    source: "android",
    screenTimeMinutes: null,
    categoryMinutes: null,
    topApps: [],
    lastPickupTime: null,
    firstPickupTime: null,
    unlockCount: null,
    leftHome: null,
    maxDistanceKm: null,
    steps: null,
    callsMade: null,
    nightNotifications: null,
    ...rest,
  };
}

function mood(overrides: Partial<MoodPoint> & { date: string }): MoodPoint {
  const { date, ...rest } = overrides;
  return { date, intensity: null, shame: null, sleepHours: null, social: null, ...rest };
}

describe("stateEngine", () => {
  it("returns an empty estimate when no signals are present", () => {
    const est = computeStateEstimate({ snapshots: [], mood: [] });
    expect(est.signals).toEqual([]);
    expect(est.summary).toBe("no clear signal");
    expect(stateEstimateContextBlock(est)).toBe("");
  });

  it("includes a sleep signal when self-reported sleep shows a short-sleep run", () => {
    const moodPoints: MoodPoint[] = [
      // 10 baseline nights to form a baseline
      ...Array.from({ length: 10 }, (_, i) => mood({ date: `2026-06-${String(i + 1).padStart(2, "0")}`, sleepHours: 7.5 })),
      // 3 recent short nights to fire the signal
      ...[1, 2, 3].map((i) => mood({ date: `2026-06-${String(i + 11).padStart(2, "0")}`, sleepHours: 4 })),
    ];
    const est = computeStateEstimate({ snapshots: [], mood: moodPoints });
    const sleepSig = est.signals.find((s) => s.source === "sleep");
    expect(sleepSig).toBeDefined();
    expect(sleepSig?.direction).toBe("risk");
    expect(sleepSig?.label.toLowerCase()).toContain("sleep");
    expect(sleepSig?.detail).toContain("3 nights");
  });

  it("includes pattern insights when phone behaviour + mood support them", () => {
    const datesHeavy = ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05"];
    const datesLight = ["2026-06-06", "2026-06-07", "2026-06-08", "2026-06-09", "2026-06-10"];
    const moodPoints: MoodPoint[] = [
      ...datesHeavy.map((d) => mood({ date: d, intensity: 8 })),
      ...datesLight.map((d) => mood({ date: d, intensity: 4 })),
    ];
    const snaps: BehaviourSnapshot[] = [
      ...datesHeavy.map((d) => snap({ date: d, screenTimeMinutes: 150 })),
      ...datesLight.map((d) => snap({ date: d, screenTimeMinutes: 45 })),
    ];
    const est = computeStateEstimate({ snapshots: snaps, mood: moodPoints });
    const patternSig = est.signals.find((s) => s.source === "pattern");
    expect(patternSig).toBeDefined();
    expect(patternSig?.label.toLowerCase()).toContain("screen");
    expect(patternSig?.direction).toBe("risk");
  });

  it("includes a supplied inflection signal", () => {
    const inflection: InflectionSignal = {
      id: "x",
      kind: "mood_trend",
      direction: "deterioration",
      metric: "mood",
      detail: "mood trending harder this week",
      opener: "",
      basis: "own-baseline heuristic",
      date: "2026-07-06",
      dataPoints: 8,
    };
    const est = computeStateEstimate({ snapshots: [], mood: [], inflection });
    const sig = est.signals.find((s) => s.source === "inflection");
    expect(sig).toBeDefined();
    expect(sig?.direction).toBe("deterioration");
    expect(sig?.detail).toContain("trending harder");
  });

  it("includes a behavioural-activation signal when the user has recent logged activities", () => {
    const baInsight: BAInsight = {
      done: 4,
      planned: 1,
      avgMastery: 7,
      avgPleasure: 6,
      topCategory: { id: "movement", label: "Movement", score: 13 },
    };
    const est = computeStateEstimate({ snapshots: [], mood: [], baInsight });
    const sig = est.signals.find((s) => s.source === "behavioural_activation");
    expect(sig).toBeDefined();
    expect(sig?.direction).toBe("protective");
    expect(sig?.label.toLowerCase()).toMatch(/activity|activities/);
    expect(sig?.detail).toContain("Movement");
  });

  it("summary lists risk signals before protective ones", () => {
    const baInsight: BAInsight = {
      done: 4,
      planned: 0,
      avgMastery: 7,
      avgPleasure: 6,
      topCategory: { id: "movement", label: "Movement", score: 13 },
    };
    const inflection: InflectionSignal = {
      id: "y",
      kind: "screening_change",
      direction: "deterioration",
      metric: "PHQ-9",
      detail: "PHQ-9 up 6 points",
      opener: "",
      basis: "RCI",
      date: "2026-07-06",
      dataPoints: 2,
    };
    const est = computeStateEstimate({ snapshots: [], mood: [], inflection, baInsight });
    expect(est.signals).toHaveLength(2);
    expect(est.summary).toMatch(/deterioration|PHQ-9|risk/i);
    expect(est.summary).toMatch(/activity|protective|movement/i);
  });

  it("context block includes signal details and a humility footer", () => {
    const baInsight: BAInsight = {
      done: 3,
      planned: 0,
      avgMastery: 6,
      avgPleasure: 5,
      topCategory: { id: "connection", label: "Connection", score: 11 },
    };
    const est = computeStateEstimate({ snapshots: [], mood: [], baInsight });
    const block = stateEstimateContextBlock(est);
    expect(block).toContain("STATE OF THE PERSON RIGHT NOW");
    expect(block).toContain("Connection");
    expect(block.toLowerCase()).toContain("authority");
    expect(block.toLowerCase()).toContain("hold gently");
  });
});

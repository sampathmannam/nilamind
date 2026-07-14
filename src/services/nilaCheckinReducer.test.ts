import { describe, it, expect } from "vitest";
import {
  INITIAL_DRAFT,
  MOOD_CHIPS,
  INTENSITY_CHIPS,
  SLEEP_CHIPS,
  ENERGY_CHIPS,
  CONTEXT_TAGS,
  checkinReducer,
  resolveCheckin,
} from "./nilaCheckinReducer";

describe("nilaCheckinReducer constants", () => {
  it("MOOD_CHIPS are the 7 redesign moods in contract order", () => {
    expect([...MOOD_CHIPS]).toEqual(["Calm", "Okay", "Low", "Anxious", "Angry", "Numb", "Overwhelmed"]);
  });
  it("INTENSITY_CHIPS map Gentle=3, Noticeable=5, Strong=7, Intense=9", () => {
    expect(INTENSITY_CHIPS.map((c) => [c.label, c.value])).toEqual([
      ["Gentle", 3],
      ["Noticeable", 5],
      ["Strong", 7],
      ["Intense", 9],
    ]);
  });
  it("SLEEP_CHIPS are 5 options: Under 5h(4), 5-6h(5.5), 7-8h(7.5), Over 8h(9), Not sure(null)", () => {
    expect(SLEEP_CHIPS.map((c) => [c.label, c.value])).toEqual([
      ["Under 5h", 4],
      ["5–6h", 5.5],
      ["7–8h", 7.5],
      ["Over 8h", 9],
      ["Not sure", null],
    ]);
  });
  it("ENERGY_CHIPS are 4 levels: Very low(1), Low(2), Moderate(3), High(4)", () => {
    expect(ENERGY_CHIPS.map((c) => [c.label, c.value])).toEqual([
      ["Very low", 1],
      ["Low", 2],
      ["Moderate", 3],
      ["High", 4],
    ]);
  });
});

describe("checkinReducer step advancement", () => {
  it("starts at the mood step with nothing chosen", () => {
    expect(INITIAL_DRAFT).toEqual({ step: "mood", label: null, intensity: null, sleepHours: null, energy: null, contextTag: null, granularEmotion: null });
  });

  it("pickMood records the label and advances to intensity", () => {
    const d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Anxious" });
    expect(d.step).toBe("intensity");
    expect(d.label).toBe("Anxious");
    expect(d.sleepHours).toBeNull();
  });

  it("pickIntensity records intensity and advances to sleep", () => {
    const moodDone = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Anxious" });
    const d = checkinReducer(moodDone, { type: "pickIntensity", intensity: 7 });
    expect(d.step).toBe("sleep");
    expect(d.intensity).toBe(7);
  });

  it("pickSleep records sleep hours and advances to energy", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Anxious" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 7 });
    d = checkinReducer(d, { type: "pickSleep", sleepHours: 5.5 });
    expect(d.step).toBe("energy");
    expect(d.sleepHours).toBe(5.5);
  });

  it("pickSleep with null (Not sure) advances to energy", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Calm" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 3 });
    d = checkinReducer(d, { type: "pickSleep", sleepHours: null });
    expect(d.step).toBe("energy");
    expect(d.sleepHours).toBeNull();
  });

  it("pickEnergy records energy level and advances to context", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Anxious" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 7 });
    d = checkinReducer(d, { type: "pickSleep", sleepHours: 7.5 });
    d = checkinReducer(d, { type: "pickEnergy", energy: 3 });
    expect(d.step).toBe("context");
    expect(d.energy).toBe(3);
    expect(d.sleepHours).toBe(7.5);
  });

  it("pickContext records context tag and advances to granularity", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Angry" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 9 });
    d = checkinReducer(d, { type: "pickSleep", sleepHours: 4 });
    d = checkinReducer(d, { type: "pickEnergy", energy: 2 });
    d = checkinReducer(d, { type: "pickContext", tag: "Work" });
    expect(d.step).toBe("granularity");
    expect(d.contextTag).toBe("Work");
  });

  it("pickGranular records the emotion and advances to done", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Angry" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 7 });
    d = checkinReducer(d, { type: "pickSleep", sleepHours: 5.5 });
    d = checkinReducer(d, { type: "pickEnergy", energy: 4 });
    d = checkinReducer(d, { type: "pickContext", tag: "Work" });
    d = checkinReducer(d, { type: "pickGranular", emotion: "Betrayed" });
    expect(d.step).toBe("done");
    expect(d.granularEmotion).toBe("Betrayed");
    expect(d.sleepHours).toBe(5.5);
  });

  it("skipGranular advances to done with null granularEmotion", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Low" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 5 });
    d = checkinReducer(d, { type: "pickSleep", sleepHours: 7.5 });
    d = checkinReducer(d, { type: "pickEnergy", energy: 2 });
    d = checkinReducer(d, { type: "pickContext", tag: "Sleep" });
    d = checkinReducer(d, { type: "skipGranular" });
    expect(d.step).toBe("done");
    expect(d.granularEmotion).toBeNull();
  });

  it("ignores out-of-order actions (intensity before mood)", () => {
    const d = checkinReducer(INITIAL_DRAFT, { type: "pickIntensity", intensity: 5 });
    expect(d).toEqual(INITIAL_DRAFT);
  });

  it("ignores sleep action before intensity", () => {
    const moodDone = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Calm" });
    const d = checkinReducer(moodDone, { type: "pickSleep", sleepHours: 7 });
    expect(d).toEqual(moodDone);
  });

  it("ignores energy action before sleep", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Calm" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 5 });
    const d2 = checkinReducer(d, { type: "pickEnergy", energy: 3 });
    expect(d2).toEqual(d);
  });
});

describe("resolveCheckin (single write trigger at granularity step)", () => {
  it("returns null on non-granularity actions", () => {
    expect(resolveCheckin(INITIAL_DRAFT, { type: "pickMood", label: "Low" })).toBeNull();
    const moodDone = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Low" });
    expect(resolveCheckin(moodDone, { type: "pickIntensity", intensity: 5 })).toBeNull();
  });

  it("resolves with a chosen granular emotion", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Anxious" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 7 });
    d = checkinReducer(d, { type: "pickSleep", sleepHours: 5.5 });
    d = checkinReducer(d, { type: "pickEnergy", energy: 3 });
    d = checkinReducer(d, { type: "pickContext", tag: "Thoughts" });
    expect(resolveCheckin(d, { type: "pickGranular", emotion: "Overwhelmed" })).toEqual({
      label: "Anxious",
      intensity: 7,
      sleepHours: 5.5,
      energy: 3,
      contextTag: "Thoughts",
      granularEmotion: "Overwhelmed",
    });
  });

  it("resolves with null granularEmotion when skipped", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Overwhelmed" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 9 });
    d = checkinReducer(d, { type: "pickSleep", sleepHours: 4 });
    d = checkinReducer(d, { type: "pickEnergy", energy: 4 });
    d = checkinReducer(d, { type: "pickContext", tag: null });
    expect(resolveCheckin(d, { type: "skipGranular" })).toEqual({
      label: "Overwhelmed",
      intensity: 9,
      sleepHours: 4,
      energy: 4,
      contextTag: null,
      granularEmotion: null,
    });
  });

  it("returns null from granularity step when label/intensity are missing", () => {
    const halfway = { step: "granularity" as const, label: null, intensity: null, sleepHours: null, energy: null, contextTag: null, granularEmotion: null };
    expect(resolveCheckin(halfway, { type: "pickGranular", emotion: "Calm" })).toBeNull();
  });
});

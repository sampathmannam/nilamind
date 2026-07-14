import { describe, it, expect } from "vitest";
import {
  INITIAL_DRAFT,
  MOOD_CHIPS,
  INTENSITY_CHIPS,
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
  it("only Strong(7) and Intense(9) cross the >=7 escalation gate", () => {
    const crossing = INTENSITY_CHIPS.filter((c) => c.value >= 7).map((c) => c.label);
    expect(crossing).toEqual(["Strong", "Intense"]);
  });
  it("ENERGY_CHIPS are 4 levels: Very low(1), Low(2), Moderate(3), High(4)", () => {
    expect(ENERGY_CHIPS.map((c) => [c.label, c.value])).toEqual([
      ["Very low", 1],
      ["Low", 2],
      ["Moderate", 3],
      ["High", 4],
    ]);
  });
  it("CONTEXT_TAGS are the 7 existing tags verbatim", () => {
    expect([...CONTEXT_TAGS]).toEqual([
      "Sleep",
      "Relationships",
      "Work",
      "Body/Health",
      "Thoughts",
      "A specific event",
      "Not sure",
    ]);
  });
});

describe("checkinReducer step advancement", () => {
  it("starts at the mood step with nothing chosen", () => {
    expect(INITIAL_DRAFT).toEqual({ step: "mood", label: null, intensity: null, energy: null, contextTag: null, granularEmotion: null });
  });

  it("pickMood records the label and advances to intensity", () => {
    const d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Anxious" });
    expect(d).toEqual({ step: "intensity", label: "Anxious", intensity: null, energy: null, contextTag: null, granularEmotion: null });
  });

  it("pickIntensity records intensity and advances to energy", () => {
    const moodDone = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Anxious" });
    const d = checkinReducer(moodDone, { type: "pickIntensity", intensity: 7 });
    expect(d).toEqual({ step: "energy", label: "Anxious", intensity: 7, energy: null, contextTag: null, granularEmotion: null });
  });

  it("pickEnergy records energy level and advances to context", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Anxious" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 7 });
    d = checkinReducer(d, { type: "pickEnergy", energy: 3 });
    expect(d).toEqual({ step: "context", label: "Anxious", intensity: 7, energy: 3, contextTag: null, granularEmotion: null });
  });

  it("pickContext records context tag and advances to granularity", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Angry" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 9 });
    d = checkinReducer(d, { type: "pickEnergy", energy: 2 });
    d = checkinReducer(d, { type: "pickContext", tag: "Work" });
    expect(d.step).toBe("granularity");
    expect(d.contextTag).toBe("Work");
  });

  it("pickContext with null tag advances to granularity", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Calm" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 3 });
    d = checkinReducer(d, { type: "pickEnergy", energy: 1 });
    d = checkinReducer(d, { type: "pickContext", tag: null });
    expect(d.step).toBe("granularity");
    expect(d.contextTag).toBeNull();
  });

  it("pickGranular records the emotion and advances to done", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Angry" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 7 });
    d = checkinReducer(d, { type: "pickEnergy", energy: 4 });
    d = checkinReducer(d, { type: "pickContext", tag: "Work" });
    d = checkinReducer(d, { type: "pickGranular", emotion: "Betrayed" });
    expect(d.step).toBe("done");
    expect(d.granularEmotion).toBe("Betrayed");
  });

  it("skipGranular advances to done with null granularEmotion", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Low" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 5 });
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

  it("ignores energy action before intensity", () => {
    const moodDone = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Calm" });
    const d = checkinReducer(moodDone, { type: "pickEnergy", energy: 3 });
    expect(d).toEqual(moodDone);
  });

  it("ignores context action before energy", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Numb" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 7 });
    const d2 = checkinReducer(d, { type: "pickContext", tag: "Sleep" });
    expect(d2).toEqual(d);
  });

  it("ignores granularity action before context", () => {
    const moodDone = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Numb" });
    const d = checkinReducer(moodDone, { type: "pickGranular", emotion: "Empty" });
    expect(d).toEqual(moodDone);
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
    d = checkinReducer(d, { type: "pickEnergy", energy: 3 });
    d = checkinReducer(d, { type: "pickContext", tag: "Thoughts" });
    expect(resolveCheckin(d, { type: "pickGranular", emotion: "Overwhelmed" })).toEqual({
      label: "Anxious",
      intensity: 7,
      energy: 3,
      contextTag: "Thoughts",
      granularEmotion: "Overwhelmed",
    });
  });

  it("resolves with null granularEmotion when skipped", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Overwhelmed" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 9 });
    d = checkinReducer(d, { type: "pickEnergy", energy: 4 });
    d = checkinReducer(d, { type: "pickContext", tag: null });
    expect(resolveCheckin(d, { type: "skipGranular" })).toEqual({
      label: "Overwhelmed",
      intensity: 9,
      energy: 4,
      contextTag: null,
      granularEmotion: null,
    });
  });

  it("returns null from granularity step when label/intensity are missing", () => {
    const halfway = { step: "granularity" as const, label: null, intensity: null, energy: null, contextTag: null, granularEmotion: null };
    expect(resolveCheckin(halfway, { type: "pickGranular", emotion: "Calm" })).toBeNull();
  });
});

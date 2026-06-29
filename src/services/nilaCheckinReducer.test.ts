import { describe, it, expect } from "vitest";
import {
  INITIAL_DRAFT,
  MOOD_CHIPS,
  INTENSITY_CHIPS,
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
    expect(INITIAL_DRAFT).toEqual({ step: "mood", label: null, intensity: null });
  });
  it("pickMood records the label and advances to intensity", () => {
    const d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Anxious" });
    expect(d).toEqual({ step: "intensity", label: "Anxious", intensity: null });
  });
  it("re-picking mood at the mood step replaces the label", () => {
    const d1 = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Low" });
    // re-entering mood step (e.g. user went back) and choosing again
    const d2 = checkinReducer({ ...d1, step: "mood" }, { type: "pickMood", label: "Calm" });
    expect(d2).toEqual({ step: "intensity", label: "Calm", intensity: null });
  });
  it("pickIntensity records intensity and advances to context", () => {
    const moodDone = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Anxious" });
    const d = checkinReducer(moodDone, { type: "pickIntensity", intensity: 7 });
    expect(d).toEqual({ step: "context", label: "Anxious", intensity: 7 });
  });
  it("pickContext advances to done", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Angry" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 9 });
    d = checkinReducer(d, { type: "pickContext", tag: "Work" });
    expect(d.step).toBe("done");
  });
  it("ignores out-of-order actions (intensity before mood)", () => {
    const d = checkinReducer(INITIAL_DRAFT, { type: "pickIntensity", intensity: 5 });
    expect(d).toEqual(INITIAL_DRAFT);
  });
  it("ignores pickContext before intensity is set", () => {
    const moodDone = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Numb" });
    const d = checkinReducer(moodDone, { type: "pickContext", tag: "Sleep" });
    expect(d).toEqual(moodDone);
  });
});

describe("resolveCheckin (single write trigger on context-resolve)", () => {
  it("returns null until the context step resolves", () => {
    expect(resolveCheckin(INITIAL_DRAFT, { type: "pickMood", label: "Low" })).toBeNull();
    const moodDone = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Low" });
    expect(resolveCheckin(moodDone, { type: "pickIntensity", intensity: 5 })).toBeNull();
  });
  it("resolves with a chosen tag", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Anxious" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 7 });
    expect(resolveCheckin(d, { type: "pickContext", tag: "Thoughts" })).toEqual({
      label: "Anxious",
      intensity: 7,
      contextTag: "Thoughts",
    });
  });
  it("resolves with null contextTag when context is skipped", () => {
    let d = checkinReducer(INITIAL_DRAFT, { type: "pickMood", label: "Overwhelmed" });
    d = checkinReducer(d, { type: "pickIntensity", intensity: 9 });
    expect(resolveCheckin(d, { type: "pickContext", tag: null })).toEqual({
      label: "Overwhelmed",
      intensity: 9,
      contextTag: null,
    });
  });
  it("does not resolve from a context action when label/intensity are missing", () => {
    const halfway = { step: "context" as const, label: null, intensity: null };
    expect(resolveCheckin(halfway, { type: "pickContext", tag: "Work" })).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { isStreamingHarm, scanForCrisis, METHOD_INTENT_PHRASES } from "./safety";

describe("isStreamingHarm (live-stream tripwire: method + 'how to' only)", () => {
  it("trips on a method keyword WITH 'how to'", () => {
    expect(isStreamingHarm("sure, here is how to overdose")).toBe(true);
    expect(isStreamingHarm("how to hang yourself")).toBe(true);
  });
  it("does NOT trip on a method keyword ALONE (no 'how to')", () => {
    expect(isStreamingHarm("if you've taken an overdose, please call 988")).toBe(false);
    expect(isStreamingHarm("a razor is dangerous")).toBe(false);
  });
  it("does NOT trip on the looser cues that would catch warm Nila phrases", () => {
    expect(isStreamingHarm("Try to hang in there")).toBe(false); // 'try' + 'hang' must NOT trip live
    expect(isStreamingHarm("have you tried taking your pill?")).toBe(false); // 'try'(tried) + 'pill'
    expect(isStreamingHarm("instructions for the breathing exercise")).toBe(false);
  });
  it("does NOT trip on benign text or empty", () => {
    expect(isStreamingHarm("let's take one breath together")).toBe(false);
    expect(isStreamingHarm("")).toBe(false);
  });
});

describe("scanForCrisis — METHOD_INTENT_PHRASES (high-precision input gate)", () => {
  it.each([
    "I'm going to slit my wrists tonight",
    "I want to cut my wrists",
    "I'm going to hang myself",
    "I'll jump off a bridge",
    "thinking about jump off a building",
    "I might jump off the roof",
    "I want to jump in front of a train",
    "jump in front of a car maybe",
    "I could throw myself in front of something",
  ])("trips on first-person method+intent: %j", (s) => {
    expect(scanForCrisis(s)).toBe(true);
  });

  // Benign controls guard the precision boundary. Collision-prone candidates were deliberately EXCLUDED
  // from METHOD_INTENT_PHRASES (e.g. "overdose on", "take all my pills/meds", "swallow all my", bare
  // "jump off a"/"jump in front of") because they match idioms/medication/parkour/tangents — these
  // strings must stay safe.
  it.each([
    "I went for a jump rope this morning",
    "I need to take my pills tonight",
    "we talked about his overdose last year",
    "let's jump off a quick tangent",
    "I want to jump in front of the camera for the photo",
    "I'm going to swallow all my pride and apologize",
  ])("does NOT trip on benign control: %j", (s) => {
    expect(scanForCrisis(s)).toBe(false);
  });

  it("exposes a non-empty phrase list", () => {
    expect(METHOD_INTENT_PHRASES.length).toBeGreaterThan(0);
  });
});

// REGRESSION GATE for the recall gaps a red-team panel found (and verified in-code): the keyword scanner
// previously MISSED these real crisis disclosures because it matched only literal substrings — e.g.
// "kill myself" was present but "KILLING myself" (the gerund) was not, so "thinking about killing myself"
// returned false. These MUST trip. Paired benign controls below prove the additions keep the deliberate
// high-precision boundary (a false "call a hotline" on a calm chat is itself harmful).
describe("scanForCrisis — ideation recall (red-panel regression)", () => {
  it.each([
    "I've been thinking about killing myself",
    "I keep thinking about killing myself tonight",
    "honestly I just want to be dead",
    "I wish I was dead",
    "I just took a whole bunch of my pills",
    "I think I overdosed last night",
    "I took all my pills an hour ago",
    "I don't want to wake up anymore",
    "nobody would even notice if I disappeared",
  ])("now trips on the missed disclosure: %j", (s) => {
    expect(scanForCrisis(s)).toBe(true);
  });

  it.each([
    "this commute is killing me",            // "killing" but not "killing myself"
    "I'm killing time before my appointment",
    "I need to take my pills tonight",        // "take" not "took"
    "I'll take all my pills exactly as prescribed",
    "we talked about his overdose last year", // "overdose" not "overdosed"
    "I don't want to wake up at 6am for work", // no "anymore"
  ])("still does NOT trip on benign control: %j", (s) => {
    expect(scanForCrisis(s)).toBe(false);
  });
});

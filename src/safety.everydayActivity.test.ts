// §9 classifier-tier precision fix (2026-07-17 tester report, Bug 2) — new guard isBenignEverydayActivity.
//
// ROOT CAUSE UNDER TEST: the quantized MiniLM embeds MISSPELLED everyday text near the crisis cluster.
// Reported device incident: "i told im going to excersise" scores 0.7316 (≥ 0.71 high-confidence bar) →
// full-screen crisis takeover, while the correctly-spelled sentence scores 0.34. Each oddity alone is safe
// (typo alone 0.5365, "i told im" alone 0.5188) — combined they compound past the bar. Same class as the
// v1.18.15 "Help me to sleep" FP (0.7249). Guard posture is IDENTICAL to the existing eight guards: fires
// only after a keyword-floor MISS, suppresses only the classifier's soft upgrade, and defers to the
// classifier on any lethal / despair / minimization-farewell co-signal. Typo robustness comes from bounded
// Damerau-Levenshtein matching against a fixed everyday-activity lexicon — deterministic, dependency-free.
import { describe, it, expect } from "vitest";
import { isBenignEverydayActivity } from "./safety";

describe("isBenignEverydayActivity — first-person everyday-activity intent (should suppress classifier)", () => {
  const BENIGN = [
    "I'm going to exercise",
    "im going to exercise",
    "im going to excersise",              // the reported typo
    "i told im going to excersise",       // the literal reported device message
    "I'm going to excersise",
    "im going to exersize",               // alternate typo (real-model 0.6136 → soft)
    "i am going to excercise",            // alternate typo
    "I'm gonna work out",
    "I'm about to go for a run",
    "i'm going to the gym",
    "I'm going to cook dinner",
    "i'm planning to study tonight",
    "I'm about to take a shower",
    "i'm going to do some yoga",
    "I will go walking in the evening",
  ];
  for (const phrase of BENIGN) {
    it(`fires (suppresses classifier) on: "${phrase}"`, () => {
      expect(isBenignEverydayActivity(phrase)).toBe(true);
    });
  }

  const GROOMING = [
    "cut my hair today",                  // real-model 0.8266 → FULL without this guard
    "I trimmed my beard",
    "got my nails done and cut my hair",
  ];
  for (const phrase of GROOMING) {
    it(`fires on grooming: "${phrase}"`, () => {
      expect(isBenignEverydayActivity(phrase)).toBe(true);
    });
  }
});

describe("isBenignEverydayActivity — vetoes and out-of-scope (must DEFER to classifier/floor)", () => {
  const MUST_NOT_SUPPRESS = [
    "I'm going to end it all",                       // lethal co-signal, no activity
    "I'm going to kill myself",                      // floor case; guard must never claim it
    "im going to exercise and then end it all",      // activity + lethal co-signal → veto
    "I'm going to the gym one last time",            // minimization/farewell veto
    "I'm going to exercise, don't worry about me, I've said my goodbyes", // farewell veto
    "I want to disappear for a while",               // despair veto — carries real signal, stays unguarded
    "I'm going to sleep forever",                    // sleep-as-death; sleep is NOT in the activity lexicon
    "going to exercise",                             // no first-person frame → out of scope
    "",                                              // empty
  ];
  for (const phrase of MUST_NOT_SUPPRESS) {
    it(`does NOT fire on: "${phrase || "<empty>"}"`, () => {
      expect(isBenignEverydayActivity(phrase)).toBe(false);
    });
  }

  it("fuzzy matching never bridges to non-activity words (short words are exact-match only)", () => {
    // "gym"→"gun", "run"→"ruin" style bridges must be impossible: len ≤ 3 requires exact match.
    expect(isBenignEverydayActivity("I'm going to gun")).toBe(false);
    expect(isBenignEverydayActivity("I'm going to ruin everything")).toBe(false);
  });
});

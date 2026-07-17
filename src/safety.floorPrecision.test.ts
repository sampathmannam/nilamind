import { describe, it, expect } from "vitest";
import { scanForCrisis } from "./safety";

// 2026-07-17 QA: high-collision floor tokens ("suicide"/"suicidal"/"cut myself"/"cant go on") fired the
// UNSUPPRESSIBLE full crisis takeover on benign idiom/topical/third-person text (verified by execution).
// A conservative guard suppresses ONLY unambiguous benign frames; every first-person/ambiguous case still
// fires (safe direction). These tests pin BOTH the suppressed false positives AND full recall.
describe("§9 floor precision — benign high-collision frames suppressed", () => {
  const benign = [
    "i need to cut myself some slack today",
    "gotta cut myself a break here",
    "she is not suicidal, just stressed about exams",
    "my sister was suicidal last year but doing so much better now",
    "he's not suicidal, he was just venting",
    "i wrote my thesis on suicide prevention policy",
    "volunteering at a suicide hotline this weekend",
    "reading a book about suicide awareness",
    "i cant go on stage without my notes",
    "cant go on the ride, i get motion sick",
    "we can't go on tour this year",
  ];
  for (const t of benign) it(`silent: "${t}"`, () => expect(scanForCrisis(t)).toBe(false));
});

describe("§9 floor precision — genuine disclosures STILL fire (recall unchanged)", () => {
  const crisis = [
    "i want to end my life",
    "i've been cutting myself again",
    "i want to cut myself",
    "i feel suicidal",
    "i am suicidal and scared",
    "i've been having suicidal thoughts lately",
    "i feel suicidal after reading about suicide prevention failures", // self-state + topical → fires
    "thinking about killing myself",
    "i cant go on anymore",                                            // genuine despair, no benign object
    "cut myself some slack but honestly i want to die",                // benign idiom + genuine token
    "i dont want to kill myself, just feeling low today",              // denial KEPT firing (safe direction)
  ];
  for (const t of crisis) it(`fires: "${t}"`, () => expect(scanForCrisis(t)).toBe(true));
});

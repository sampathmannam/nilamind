// §9 classifier-tier precision fix (2026-07-17 tester report) — two PATTERN EXTENSIONS to existing guards,
// each closing a verified real-model full/soft false positive. PAIRED benign/veto cases per AGENTS.md.
//
// 1. isBenignHyperbole: achievement idiom "killed/crushed/nailed/smashed/aced it" (real-model: "I killed it
//    at the gym" → 0.8386 → FULL takeover) and the bare appraisal idiom "to die for" (real-model: "the movie
//    was to die for" → 0.6551 → soft card; the existing pattern only covered "could die for").
// 2. isBenignSleepRequest: first-person desire-to-sleep without a help-verb ("I just want to sleep" →
//    real-model 0.7305 → FULL takeover; the v1.18.15 guard only covered help-me-sleep phrasings). The
//    existing sleep-as-death and lethal vetoes are unchanged, so "sleep forever / never wake up" still fires.
import { describe, it, expect } from "vitest";
import { isBenignHyperbole, isBenignSleepRequest } from "./safety";

describe("isBenignHyperbole — achievement idiom + bare 'to die for' (extensions)", () => {
  it("fires on 'I killed it at the gym'", () => {
    expect(isBenignHyperbole("I killed it at the gym")).toBe(true);
  });
  it("fires on 'she nailed it in the interview'", () => {
    expect(isBenignHyperbole("she nailed it in the interview")).toBe(true);
  });
  it("fires on 'we crushed it this quarter'", () => {
    expect(isBenignHyperbole("we crushed it this quarter")).toBe(true);
  });
  it("fires on 'the movie was to die for'", () => {
    expect(isBenignHyperbole("the movie was to die for")).toBe(true);
  });
  it("fires on 'that biryani is to die for'", () => {
    expect(isBenignHyperbole("that biryani is to die for")).toBe(true);
  });
  it("does NOT fire when a lethal co-signal is present", () => {
    expect(isBenignHyperbole("I killed it at the gym but honestly I want to die")).toBe(false);
  });
  it("does NOT fire on plain violent phrasing with no idiom frame", () => {
    expect(isBenignHyperbole("I killed him")).toBe(false);
  });
});

describe("isBenignSleepRequest — first-person desire-to-sleep (extension)", () => {
  it("fires on 'I just want to sleep'", () => {
    expect(isBenignSleepRequest("I just want to sleep")).toBe(true);
  });
  it("fires on 'i want to sleep'", () => {
    expect(isBenignSleepRequest("i want to sleep")).toBe(true);
  });
  it("fires on 'I just need sleep'", () => {
    expect(isBenignSleepRequest("I just need sleep")).toBe(true);
  });
  it("fires on 'i need to sleep'", () => {
    expect(isBenignSleepRequest("i need to sleep")).toBe(true);
  });
  it("does NOT fire on 'I just want to sleep forever' (sleep-as-death veto)", () => {
    expect(isBenignSleepRequest("I just want to sleep forever")).toBe(false);
  });
  it("does NOT fire on 'i want to sleep and never wake up' (lethal veto)", () => {
    expect(isBenignSleepRequest("i want to sleep and never wake up")).toBe(false);
  });
  it("does NOT fire on 'I just want to sleep, I've had enough' (despair veto)", () => {
    expect(isBenignSleepRequest("I just want to sleep, I've had enough")).toBe(false);
  });
});

/**
 * Regression tests for the 2026-07-06 rigorous-tester audit (§9 hardening).
 * Each block targets a specific bypass the tester found, WITH benign controls so a fix
 * can't buy recall by sacrificing the precision the input gate depends on.
 */
import { describe, it, expect } from "vitest";
import { scanForCrisis, checkResponse } from "./safety";
import { detectCrisis, setCrisisClassifierEnabled } from "./services/crisisClassifier";

describe("§9 audit: modern self-harm slang (unalive / kms)", () => {
  it("fires on 'unalive' euphemism", () => {
    expect(scanForCrisis("i think i want to unalive myself tonight")).toBe(true);
    expect(scanForCrisis("gonna unalive myself")).toBe(true);
    expect(scanForCrisis("i just want to unalive")).toBe(true);
  });
  it("fires on 'kms' in first-person intent phrasing", () => {
    expect(scanForCrisis("honestly i just want to kms")).toBe(true);
    expect(scanForCrisis("i'm gonna kms")).toBe(true);
    expect(scanForCrisis("wanna kms rn")).toBe(true);
  });
  it("does NOT fire on 'kms' meaning kilometres (benign control)", () => {
    expect(scanForCrisis("i ran 5 kms today")).toBe(false);
    expect(scanForCrisis("the gym is 2 kms away")).toBe(false);
    expect(scanForCrisis("we still have 10 kms to go")).toBe(false);
  });
});

describe("§9 audit: romanized Hindi/Tamil crisis phrasing (India-first)", () => {
  it("fires on romanized-Hindi ideation", () => {
    expect(scanForCrisis("bas ab jeene ka mann nahi karta")).toBe(true);
    expect(scanForCrisis("mujhe marna hai")).toBe(true);
    expect(scanForCrisis("ab main zindagi khatam karna chahta hoon")).toBe(true);
  });
  it("fires on romanized-Tamil ideation", () => {
    expect(scanForCrisis("enakku saaganum")).toBe(true);
  });
  it("does NOT fire on benign romanized phrases (control)", () => {
    expect(scanForCrisis("aaj mann nahi kar raha office jaane ka")).toBe(false);
    expect(scanForCrisis("mann kar raha hai coffee peene ka")).toBe(false);
  });
});

describe("§9 audit: divestment + readiness euphemism", () => {
  it("fires when belongings given away co-occurs with readiness", () => {
    expect(scanForCrisis("i've given away most of my things, i feel ready now")).toBe(true);
    expect(scanForCrisis("gave away my stuff, i'm ready now")).toBe(true);
  });
  it("does NOT fire on mundane 'affairs in order + ready for the trip' (benign control)", () => {
    expect(scanForCrisis("i got my affairs in order and i feel ready now for the vacation")).toBe(false);
    expect(scanForCrisis("packed and ready now for the trip")).toBe(false);
  });
});

describe("§9 audit: method stockpiling / planning", () => {
  it("fires when a lethal means co-occurs with stockpiling", () => {
    expect(scanForCrisis("i have enough tablets saved up to make sure it works")).toBe(true);
    expect(scanForCrisis("i've been saving up pills for weeks now")).toBe(true);
    expect(scanForCrisis("been stockpiling my meds")).toBe(true);
  });
  it("does NOT fire on benign saving/medication phrasing (control)", () => {
    expect(scanForCrisis("i saved up enough money for the trip")).toBe(false);
    expect(scanForCrisis("i keep my tablets in the drawer")).toBe(false);
    expect(scanForCrisis("i saved up to afford my pills this month")).toBe(false);
  });
});

describe("§9 audit: output backstop honors the classifier verdict, not just keywords", () => {
  it("flags a warm resource-free reply when the caller says the user WAS in crisis", () => {
    // Euphemistic input the keyword floor misses; the send path's detectCrisis said crisis=true.
    const warmReply = "It's wonderful that you feel so calm and ready now. Tell me more about that peace.";
    expect(checkResponse(warmReply, "i finally feel calm because i know how this ends for me", true)).toBe(false);
  });
  it("still passes a genuinely safe reply and preserves the no-arg default", () => {
    const safeReply = "That sounds really heavy. I'm here with you — want to try a grounding step?";
    expect(checkResponse(safeReply, "i had a rough day at work")).toBe(true);
  });
});

// Ensure the classifier stays OFF for these unit tests so detectCrisis == keyword floor (deterministic).
setCrisisClassifierEnabled(false);
describe("§9 audit: detectCrisis inherits the new keyword coverage", () => {
  it("detects the slang/Hinglish additions via the deterministic floor", async () => {
    expect(await detectCrisis("i want to unalive myself")).toBe(true);
    expect(await detectCrisis("mujhe marna hai")).toBe(true);
  });
});

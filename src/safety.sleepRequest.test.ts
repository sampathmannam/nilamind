import { describe, it, expect } from "vitest";
import { isBenignSleepRequest } from "./safety";

describe("safety — isBenignSleepRequest (§9 false-positive guard)", () => {
  // ── Ordinary sleep-help requests (should NOT trigger crisis) ─────────────────
  it("passes 'Help me to sleep' (the reported device false positive)", () => {
    expect(isBenignSleepRequest("Help me to sleep")).toBe(true);
  });

  it("passes 'help me sleep'", () => {
    expect(isBenignSleepRequest("help me sleep")).toBe(true);
  });

  it("passes 'help me fall asleep'", () => {
    expect(isBenignSleepRequest("help me fall asleep")).toBe(true);
  });

  it("passes 'I can't sleep, please help'", () => {
    expect(isBenignSleepRequest("I can't sleep, please help")).toBe(true);
  });

  it("passes 'help me get to sleep'", () => {
    expect(isBenignSleepRequest("help me get to sleep")).toBe(true);
  });

  it("passes 'can you help me sleep better'", () => {
    expect(isBenignSleepRequest("can you help me sleep better")).toBe(true);
  });

  it("passes 'I'm having trouble sleeping tonight'", () => {
    expect(isBenignSleepRequest("I'm having trouble sleeping tonight")).toBe(true);
  });

  it("passes 'how do I fall asleep faster'", () => {
    expect(isBenignSleepRequest("how do I fall asleep faster")).toBe(true);
  });

  it("passes 'I have insomnia and need help'", () => {
    expect(isBenignSleepRequest("I have insomnia and need help")).toBe(true);
  });

  it("passes empty string", () => {
    expect(isBenignSleepRequest("")).toBe(false);
  });

  it("passes null", () => {
    expect(isBenignSleepRequest(null as unknown as string)).toBe(false);
  });

  // ── Real crisis (should NOT be suppressed — sleep-as-death euphemism / lethal co-signal veto) ──
  it("does NOT pass 'help me sleep forever' (death euphemism)", () => {
    expect(isBenignSleepRequest("help me sleep forever")).toBe(false);
  });

  it("does NOT pass 'help me go to sleep and never wake up' (lethal co-signal)", () => {
    expect(isBenignSleepRequest("help me go to sleep and never wake up")).toBe(false);
  });

  it("does NOT pass 'help me sleep, I want to end it all' (lethal co-signal)", () => {
    expect(isBenignSleepRequest("help me sleep, I want to end it all")).toBe(false);
  });

  it("does NOT pass 'I can't sleep, I just want it all to end' (weary/despair)", () => {
    expect(isBenignSleepRequest("I can't sleep, I just want it all to end")).toBe(false);
  });

  it("does NOT pass 'put me to sleep permanently' (death euphemism, not an insomnia request)", () => {
    expect(isBenignSleepRequest("put me to sleep permanently")).toBe(false);
  });

  // ── Real crisis found by adversarial code review (2026-07-16): despair phrasing with a sleep-help
  // opener that the shared WEARY_DESPAIR_PATTERNS list did not yet catch ────────────────────────────
  it("does NOT pass 'help me sleep, I've had enough' (despair)", () => {
    expect(isBenignSleepRequest("help me sleep, I've had enough")).toBe(false);
  });

  it("does NOT pass 'help me sleep, I can't handle this anymore' (despair)", () => {
    expect(isBenignSleepRequest("help me sleep, I can't handle this anymore")).toBe(false);
  });

  it("does NOT pass 'help me sleep, I'm at the end of my rope' (despair)", () => {
    expect(isBenignSleepRequest("help me sleep, I'm at the end of my rope")).toBe(false);
  });

  it("does NOT pass 'help me sleep, life is too much' (despair)", () => {
    expect(isBenignSleepRequest("help me sleep, life is too much")).toBe(false);
  });

  // ── Real crisis found by adversarial code review — minimization/farewell markers (same veto
  // isBenignOkayReassurance already applies) with a sleep-help opener ─────────────────────────────
  it("does NOT pass 'help me sleep, when I'm gone don't worry about anything' (minimization/farewell)", () => {
    expect(isBenignSleepRequest("help me sleep, when I'm gone don't worry about anything")).toBe(false);
  });

  it("does NOT pass 'help me sleep one last time' (minimization/farewell)", () => {
    expect(isBenignSleepRequest("help me sleep one last time")).toBe(false);
  });

  it("does NOT pass 'help me sleep, I've said my goodbyes' (minimization/farewell)", () => {
    expect(isBenignSleepRequest("help me sleep, I've said my goodbyes")).toBe(false);
  });

  it("does NOT pass 'help me sleep, at peace now' (minimization/farewell)", () => {
    expect(isBenignSleepRequest("help me sleep, at peace now")).toBe(false);
  });

  // ── Non-sleep-help (should NOT match) ─────────────────────────────────────────
  it("does NOT match 'help me with my homework' (no sleep framing)", () => {
    expect(isBenignSleepRequest("help me with my homework")).toBe(false);
  });

  it("does NOT match 'I feel sad today' (no sleep framing)", () => {
    expect(isBenignSleepRequest("I feel sad today")).toBe(false);
  });
});

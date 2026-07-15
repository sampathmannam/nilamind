import { describe, it, expect } from "vitest";
import { isBenignHeartbreakIdiom, isBenignHelpSeeking } from "./safety";

describe("safety — isBenignHeartbreakIdiom (§9 false-positive guard)", () => {
  // ── Benign heartbreak idioms (should NOT trigger crisis) ─────────────────────
  it("passes 'he broke my heart' (classic idiom)", () => {
    expect(isBenignHeartbreakIdiom("he broke my heart")).toBe(true);
  });

  it("passes 'my heart is shattered after the breakup'", () => {
    expect(isBenignHeartbreakIdiom("my heart is shattered after the breakup")).toBe(true);
  });

  it("passes 'i can't go on without her' (attachment distress)", () => {
    expect(isBenignHeartbreakIdiom("i can't go on without her")).toBe(true);
  });

  it("passes 'drowning in grief over my mom'", () => {
    expect(isBenignHeartbreakIdiom("drowning in grief over my mom")).toBe(true);
  });

  it("passes 'i'm dying inside after she left'", () => {
    expect(isBenignHeartbreakIdiom("i'm dying inside after she left")).toBe(true);
  });

  it("passes 'it kills me to see him with someone else'", () => {
    expect(isBenignHeartbreakIdiom("it kills me to see him with someone else")).toBe(true);
  });

  it("passes 'my heart feels heavy and empty'", () => {
    expect(isBenignHeartbreakIdiom("my heart feels heavy and empty")).toBe(true);
  });

  it("passes 'shattered my heart into pieces'", () => {
    expect(isBenignHeartbreakIdiom("shattered my heart into pieces")).toBe(true);
  });

  it("passes 'overwhelmed by the pain of losing him'", () => {
    expect(isBenignHeartbreakIdiom("overwhelmed by the pain of losing him")).toBe(true);
  });

  it("passes empty string", () => {
    expect(isBenignHeartbreakIdiom("")).toBe(false);
  });

  it("passes null", () => {
    expect(isBenignHeartbreakIdiom(null as unknown as string)).toBe(false);
  });

  // ── Real crisis (should NOT be suppressed — lethal co-signal veto) ───────────
  it("does NOT pass 'broke my heart and i want to die' (lethal co-signal)", () => {
    expect(isBenignHeartbreakIdiom("broke my heart and i want to die")).toBe(false);
  });

  it("does NOT pass 'i can't go on without her, kill myself' (lethal co-signal)", () => {
    expect(isBenignHeartbreakIdiom("i can't go on without her, kill myself")).toBe(false);
  });

  it("does NOT pass 'i'm dying inside, end my life' (lethal co-signal)", () => {
    expect(isBenignHeartbreakIdiom("i'm dying inside, end my life")).toBe(false);
  });

  // ── Non-heartbreak (should NOT match) ────────────────────────────────────────
  it("does NOT match plain 'i feel sad' (no heartbreak idiom)", () => {
    expect(isBenignHeartbreakIdiom("i feel sad today")).toBe(false);
  });

  it("does NOT match 'i'm tired of everything' (no heartbreak idiom)", () => {
    expect(isBenignHeartbreakIdiom("i'm tired of everything")).toBe(false);
  });
});

describe("safety — isBenignHelpSeeking (§9 false-positive guard)", () => {
  // ── Past-tense help-seeking (should NOT trigger crisis) ──────────────────────
  it("passes 'i consulted a psychiatrist last week'", () => {
    expect(isBenignHelpSeeking("i consulted a psychiatrist last week")).toBe(true);
  });

  it("passes 'my parents took me to a therapist'", () => {
    expect(isBenignHelpSeeking("my parents took me to a therapist")).toBe(true);
  });

  it("passes 'i went to therapy yesterday'", () => {
    expect(isBenignHelpSeeking("i went to therapy yesterday")).toBe(true);
  });

  it("passes 'been to counselling for anxiety'", () => {
    expect(isBenignHelpSeeking("been to counselling for anxiety")).toBe(true);
  });

  it("passes 'i saw a therapist about my mood'", () => {
    expect(isBenignHelpSeeking("i saw a therapist about my mood")).toBe(true);
  });

  it("passes 'told my mom about getting help'", () => {
    expect(isBenignHelpSeeking("told my mom about getting help")).toBe(true);
  });

  it("passes 'i'm currently in recovery'", () => {
    expect(isBenignHelpSeeking("i'm currently in recovery")).toBe(true);
  });

  it("passes 'i talked to a counsellor about it'", () => {
    expect(isBenignHelpSeeking("i talked to a counsellor about it")).toBe(true);
  });

  it("passes 'i'm taking my meds as prescribed'", () => {
    expect(isBenignHelpSeeking("i'm taking my meds as prescribed")).toBe(true);
  });

  it("passes empty string", () => {
    expect(isBenignHelpSeeking("")).toBe(false);
  });

  it("passes null", () => {
    expect(isBenignHelpSeeking(null as unknown as string)).toBe(false);
  });

  // ── Real crisis (should NOT be suppressed — lethal co-signal veto) ───────────
  it("does NOT pass 'i went to therapy and want to die' (lethal co-signal)", () => {
    expect(isBenignHelpSeeking("i went to therapy and want to die")).toBe(false);
  });

  it("does NOT pass 'consulted psychiatrist but i want to kill myself' (lethal co-signal)", () => {
    expect(isBenignHelpSeeking("consulted psychiatrist but i want to kill myself")).toBe(false);
  });

  // ── Non-help-seeking (should NOT match) ──────────────────────────────────────
  it("does NOT match 'i feel depressed' (no help-seeking)", () => {
    expect(isBenignHelpSeeking("i feel depressed today")).toBe(false);
  });

  it("does NOT match 'my doctor is nice' (no help-seeking verb)", () => {
    expect(isBenignHelpSeeking("my doctor is nice")).toBe(false);
  });
});

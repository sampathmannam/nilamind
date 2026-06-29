import { describe, it, expect } from "vitest";
import { REACH_OPENERS, REACH_FRAMING, buildSmsHref, checkReachText } from "./reachOut";
import { scanForCrisis } from "../safety";

describe("REACH_OPENERS", () => {
  it("has >=4 non-empty, non-disclosing templates", () => {
    expect(REACH_OPENERS.length).toBeGreaterThanOrEqual(4);
    const banned = /suicid|depress|self.?harm|kill myself|diagnos/i;
    const ids = new Set<string>();
    for (const o of REACH_OPENERS) {
      expect(o.id).toBeTruthy();
      expect(ids.has(o.id)).toBe(false);
      ids.add(o.id);
      expect(o.text.length).toBeGreaterThan(10);
      expect(banned.test(o.text)).toBe(false);
    }
  });

  it("every default opener passes the real §9 check (scanForCrisis === false)", () => {
    // stricter than the ban-regex: a default must never trip the deterministic crisis scanner
    for (const o of REACH_OPENERS) {
      expect(scanForCrisis(o.text)).toBe(false);
    }
  });
});

describe("REACH_FRAMING", () => {
  it(">=3 items, each cited, and none NEGATES the user's self-worth", () => {
    expect(REACH_FRAMING.length).toBeGreaterThanOrEqual(3);
    const negation = /you('?re| are) not (a|an)\b/i; // affirm the act/relationship, don't argue self-belief
    for (const f of REACH_FRAMING) {
      expect(f.text.length).toBeGreaterThan(10);
      expect(f.basis.length).toBeGreaterThan(5);
      expect(negation.test(f.text)).toBe(false);
    }
  });
});

describe("buildSmsHref", () => {
  it("produces a recipient-less, percent-encoded sms: body (no stray &)", () => {
    expect(buildSmsHref("hi there & you")).toBe("sms:?body=" + encodeURIComponent("hi there & you"));
    expect(buildSmsHref("hi there & you")).not.toContain("?&");
  });
});

describe("checkReachText (send-time §9 gate)", () => {
  it("fires across scanForCrisis categories", () => {
    expect(checkReachText("I want to kill myself")).toBe(true); // suicidal
    expect(checkReachText("I want to vanish")).toBe(true); // indirect metaphor
    expect(checkReachText("I just want to be gone")).toBe(true); // indirect metaphor
    expect(checkReachText("I want to cut myself")).toBe(true); // self-harm
    expect(checkReachText("I'm going to hang myself")).toBe(true); // method+intent
  });
  it("is false for ordinary openers / empty", () => {
    expect(checkReachText("can we talk this week?")).toBe(false);
    expect(checkReachText("I've been struggling a bit")).toBe(false);
    expect(checkReachText("")).toBe(false);
  });
});

import { describe, it, expect, afterEach } from "vitest";
import { REACH_OPENERS, REACH_FRAMING, buildSmsHref, checkReachText } from "./reachOut";
import { scanForCrisis } from "../safety";
import { setCrisisEmbedder, setCrisisClassifierEnabled } from "./crisisClassifier";

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
  afterEach(() => { setCrisisClassifierEnabled(false); setCrisisEmbedder(null); });

  it("fires across the keyword floor (preserved through the async detectCrisis swap)", async () => {
    expect(await checkReachText("I want to kill myself")).toBe(true); // suicidal
    expect(await checkReachText("I want to vanish")).toBe(true); // indirect metaphor
    expect(await checkReachText("I just want to be gone")).toBe(true); // indirect metaphor
    expect(await checkReachText("I want to cut myself")).toBe(true); // self-harm
    expect(await checkReachText("I'm going to hang myself")).toBe(true); // method+intent
  });
  it("is false for ordinary openers / empty", async () => {
    expect(await checkReachText("can we talk this week?")).toBe(false);
    expect(await checkReachText("I've been struggling a bit")).toBe(false);
    expect(await checkReachText("")).toBe(false);
  });
  it("catches the 'affairs in order + at peace' euphemism DETERMINISTICALLY", async () => {
    // History: this used to be a "classifier COVERAGE WIN" test, but it only passed because it STUBBED the
    // embedder with a crisis-positive vector (weights.coef) — it never proved the real MiniLM catches this
    // phrase. It doesn't: the real model scores it ~0.27, below the 0.58 threshold (see
    // crisisClassifier.realmodel.test.ts). So the euphemism is now caught by the deterministic euphemism gate
    // in scanForCrisis (prep-cue "affairs in order" CO-OCCURRING with acceptance-cue "at peace with it"),
    // which is model-independent and always-on — strictly stronger than a soft classifier upgrade.
    const euphemism = "I've put my affairs in order and finally feel at peace with it";
    expect(scanForCrisis(euphemism)).toBe(true);           // deterministic floor now catches it
    expect(await checkReachText(euphemism)).toBe(true);    // so the reach-out gate elevates it, classifier OFF
  });

  it("does NOT fire on either euphemism cue alone (precision boundary)", () => {
    expect(scanForCrisis("I put my affairs in order before the vacation")).toBe(false); // prep cue only
    expect(scanForCrisis("I lost the game but I'm at peace with it")).toBe(false);       // acceptance cue only
  });
});

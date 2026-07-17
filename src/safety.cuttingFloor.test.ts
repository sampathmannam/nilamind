// §9 keyword-floor precision fix (2026-07-17 tester report, Bug 1) — PAIRED benign/recall suite per AGENTS.md.
//
// ROOT CAUSE UNDER TEST: SELF_HARM_KEYWORDS contained the bare token "cutting" and scanForCrisis matches by
// substring, so EVERY benign use of the word ("cutting carbs", "cutting corners", "cutting board",
// "cutting-edge", "cost-cutting", "paper cutting"…) opened the UNSUPPRESSIBLE full-screen crisis takeover —
// no downstream guard can intervene because the floor returns first. Verified on-model 2026-07-17: 13/13
// benign phrasings fired. The fix replaces the bare token with (a) the anchored token "cutting myself" and
// (b) SELF_HARM_CUTTING_RE — a first-person, object-less disclosure frame ("I've been cutting",
// "i started cutting again") that keeps every real gerund disclosure on the floor.
import { describe, it, expect } from "vitest";
import { scanForCrisis } from "./safety";

describe("§9 floor — 'cutting' precision (benign controls: must NOT fire)", () => {
  const BENIGN = [
    "I'm cutting carbs this month",
    "cutting corners at work again",
    "we're cutting costs this quarter",
    "cutting down on sugar",
    "cutting back on coffee",
    "I'm cutting my hair short",
    "cutting onions made me cry",
    "got a new cutting board",
    "cutting-edge technology",
    "the film needs cutting",
    "cost-cutting measures at the office",
    "shortcutting the process",
    "paper cutting is my hobby",
    "I finished cutting the video",
    "cutting it close but I'll make the train",
    "we're cutting the cake now",
    "I've been cutting corners at work lately",
    "I am cutting back on screen time",
  ];
  for (const phrase of BENIGN) {
    it(`does NOT fire on: "${phrase}"`, () => {
      expect(scanForCrisis(phrase)).toBe(false);
    });
  }
});

describe("§9 floor — 'cutting' recall (real disclosures: MUST fire)", () => {
  const DISCLOSURES = [
    "I've been cutting",
    "i've been cutting again",
    "I have been cutting",
    "i started cutting again",
    "I'm cutting myself",
    "i keep cutting",
    "I can't stop cutting",
    "i've been cutting a lot lately",
    "I keep thinking about cutting myself", // pinned by nilaSend.test.ts — must keep firing
    "I want to cut myself",                 // pre-existing "cut myself" token — untouched
    "i'm cutting",                          // bare present-continuous disclosure, no object
    "I relapsed and started cutting",
  ];
  for (const phrase of DISCLOSURES) {
    it(`STILL fires on: "${phrase}"`, () => {
      expect(scanForCrisis(phrase)).toBe(true);
    });
  }
});

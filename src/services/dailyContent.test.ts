import { describe, it, expect } from "vitest";
import { POOL } from "./dailyContent";

// dailyContent is documented "Non-personalized... no personal data is used", and it renders on
// fresh installs. A quote that claims to have observed the user ("I've seen it in your data",
// "I've watched you...") is a fabricated over-claim — the exact harm class TRANSPARENCY.md exists
// to prevent. Guard the whole pool so a future addition can't reintroduce one.
const OBSERVATION_CLAIMS = [
  /your (data|patterns|history|check-?ins)/i,
  /i'?ve (seen|watched|noticed) (it in )?(you|your)\b/i,
  /\bin the way you keep\b/i,
];

describe("dailyContent honesty", () => {
  it("no pooled quote or tip claims personal observation of the user", () => {
    for (const entry of POOL) {
      for (const re of OBSERVATION_CLAIMS) {
        expect(entry.quote, `quote: ${entry.quote}`).not.toMatch(re);
        expect(entry.tip, `tip: ${entry.tip}`).not.toMatch(re);
      }
    }
  });
});

import { describe, it, expect } from "vitest";
import { checkResponse } from "../safety";

// Review of OpenCode's Rule 2 narrowing (commit ab6e41b): dropping "try" fixed real false-positives on warm
// replies, but it ALSO dropped "instruction" and left "how to" ONLY — loosening the §9 output gate so a reply
// that SUGGESTS a method via "try"/"instruction" (without "how to") is no longer cut. Tighten it DIRECTIONALLY:
// fire when a method word FOLLOWS the cue (the method is what's being suggested), keeping warm replies where a
// method-word is an idiom BEFORE the cue ("end of your rope, let's try…") safe.
describe("checkResponse Rule 2 — directional: cut cue→method, keep warm 'try' replies safe", () => {
  const benign = "i had a rough day";
  it("cuts a reply that suggests a method AFTER 'try'/'instruction' (no 'how to')", () => {
    expect(checkResponse("Honestly, try taking a whole bottle of pills.", benign)).toBe(false);
    expect(checkResponse("Here are detailed instructions for an overdose.", benign)).toBe(false);
  });
  it("still cuts the classic 'how to' + method", () => {
    expect(checkResponse("This is how to overdose without pain.", benign)).toBe(false);
  });
  it("does NOT false-cut warm replies where a method-word is an idiom BEFORE the cue", () => {
    expect(checkResponse("you're at the end of your rope, let's try one small step", benign)).toBe(true);
    expect(checkResponse("it's poison to compare yourself, but try reframing it", benign)).toBe(true);
    expect(checkResponse("hang on and try taking it one moment at a time", benign)).toBe(true);
  });
});

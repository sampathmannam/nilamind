import { describe, it, expect } from "vitest";
import { checkSttCoherence } from "./sttCoherenceGate";

describe("sttCoherenceGate — checkSttCoherence", () => {
  it("passes coherent English text", () => {
    expect(checkSttCoherence("i feel really anxious today").coherent).toBe(true);
  });

  it("passes short but meaningful text", () => {
    expect(checkSttCoherence("help me").coherent).toBe(true);
  });

  it("fails empty string", () => {
    expect(checkSttCoherence("").coherent).toBe(false);
  });

  it("fails whitespace-only", () => {
    expect(checkSttCoherence("   ").coherent).toBe(false);
  });

  it("fails single character", () => {
    expect(checkSttCoherence("a").coherent).toBe(false);
  });

  it("fails two characters", () => {
    expect(checkSttCoherence("hi").coherent).toBe(false);
  });

  it("fails high special character ratio", () => {
    expect(checkSttCoherence("!!! @@@ ### $$$").coherent).toBe(false);
  });

  it("fails excessive word repetition", () => {
    expect(checkSttCoherence("the the the the the the").coherent).toBe(false);
  });

  it("passes normal repetition (2 times)", () => {
    expect(checkSttCoherence("i feel i feel").coherent).toBe(true);
  });

  it("fails consonant clusters", () => {
    expect(checkSttCoherence("xyz xyz xyz xyz").coherent).toBe(false);
  });

  it("passes natural hesitation in long text", () => {
    expect(checkSttCoherence("um i think maybe i should go to the store today").coherent).toBe(true);
  });

  it("returns reason for failures", () => {
    const r = checkSttCoherence("");
    expect(r.reason).toBeTruthy();
  });
});

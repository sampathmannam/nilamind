import { describe, it, expect } from "vitest";
import { matchesWakeWord } from "./wakeWord";

describe("matchesWakeWord", () => {
  it("fires on the exact word", () => {
    expect(matchesWakeWord("nila")).toBe(true);
  });
  it("fires inside a phrase", () => {
    expect(matchesWakeWord("hey nila are you there")).toBe(true);
  });
  it("is case-insensitive", () => {
    expect(matchesWakeWord("NILA")).toBe(true);
  });
  it("does NOT fire on a substring", () => {
    expect(matchesWakeWord("manila envelope")).toBe(false);
  });
  it("does NOT fire on empty", () => {
    expect(matchesWakeWord("")).toBe(false);
  });
  // device-confirmed accept-set finalised in Task 9
  it("accepts phonetic variant neela", () => {
    expect(matchesWakeWord("neela")).toBe(true);
  });
});

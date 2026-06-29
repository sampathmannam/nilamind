import { describe, it, expect } from "vitest";
import { mapEmotion, parseIntensity, stripProvenance } from "./emotionParse";

describe("parseIntensity", () => {
  it("reads a bare digit 1-10", () => {
    expect(parseIntensity("about a 7 today")).toBe(7);
    expect(parseIntensity("10")).toBe(10);
  });
  it("reads spelled-out numbers", () => {
    expect(parseIntensity("maybe three")).toBe(3);
    expect(parseIntensity("feeling seven out of ten")).toBe(7); // digit wins first
  });
  it("returns null when no number is present", () => {
    expect(parseIntensity("really bad")).toBeNull();
    expect(parseIntensity("")).toBeNull();
  });
  it("does not match numbers above 10", () => {
    expect(parseIntensity("11")).toBeNull();
  });
});

describe("mapEmotion", () => {
  it("maps a known emotion label (case-insensitive substring)", () => {
    expect(mapEmotion("I'm so ANXIOUS right now")).toBe("Anxious");
    expect(mapEmotion("feeling calm")).toBe("Calm");
  });
  it("maps synonyms via the extra table", () => {
    expect(mapEmotion("total panic")).toBe("Anxious");
    expect(mapEmotion("i feel empty")).toBe("Numb");
    expect(mapEmotion("just tired")).toBe("Low");
  });
  it("title-cases the first word as a fallback", () => {
    expect(mapEmotion("grumpy")).toBe("Grumpy");
  });
  it("returns empty string for empty input", () => {
    expect(mapEmotion("")).toBe("");
  });
});

describe("stripProvenance", () => {
  it("strips a trailing parenthetical suffix", () => {
    expect(stripProvenance("Anxious (Nila)")).toBe("Anxious");
    expect(stripProvenance("Low (One-Tap)")).toBe("Low");
    expect(stripProvenance("Angry (Nila voice)")).toBe("Angry");
  });
  it("leaves a bare emotion untouched", () => {
    expect(stripProvenance("Numb")).toBe("Numb");
  });
  it("only strips the final parenthetical, trimming whitespace", () => {
    expect(stripProvenance("Sad  (Quick)  ")).toBe("Sad");
  });
});

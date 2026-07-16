import { describe, it, expect } from "vitest";
import { mapSomaticExpression, isSomaticExpression } from "./somatization";

describe("mapSomaticExpression", () => {
  it("maps headache to stressed", () => {
    expect(mapSomaticExpression("my head is pounding")).toBe("stressed");
  });

  it("maps chest tightness to anxious", () => {
    expect(mapSomaticExpression("my chest feels tight")).toBe("anxious");
  });

  it("maps insomnia to anxious", () => {
    expect(mapSomaticExpression("I can't fall asleep")).toBe("anxious");
  });

  it("maps stomach pain to anxious", () => {
    expect(mapSomaticExpression("my stomach hurts")).toBe("anxious");
  });

  it("maps dizziness to anxious", () => {
    expect(mapSomaticExpression("I feel dizzy all the time")).toBe("anxious");
  });

  it("maps body aches to tired", () => {
    expect(mapSomaticExpression("my body aches everywhere")).toBe("tired");
  });

  it("maps fatigue to tired", () => {
    expect(mapSomaticExpression("I feel so fatigued")).toBe("tired");
  });

  it("maps shortness of breath to anxious", () => {
    expect(mapSomaticExpression("I can't catch my breath")).toBe("anxious");
  });

  it("returns null for non-somatic text", () => {
    expect(mapSomaticExpression("I am happy today")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(mapSomaticExpression("")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(mapSomaticExpression("My Head Is Pounding")).toBe("stressed");
  });
});

describe("isSomaticExpression", () => {
  it("returns true for somatic text", () => {
    expect(isSomaticExpression("my head is pounding")).toBe(true);
  });

  it("returns false for non-somatic text", () => {
    expect(isSomaticExpression("I am happy")).toBe(false);
  });
});

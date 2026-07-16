import { describe, it, expect } from "vitest";
import { mapCulturalIdiom, isCulturalIdiom } from "./culturalIdiomMapping";

describe("mapCulturalIdiom", () => {
  it("maps 'tension' to anxious", () => {
    expect(mapCulturalIdiom("I have so much tension")).toBe("anxious");
  });

  it("maps 'pressure' to overwhelmed", () => {
    expect(mapCulturalIdiom("there is so much pressure on me")).toBe("overwhelmed");
  });

  it("maps 'heavy heart' to sad", () => {
    expect(mapCulturalIdiom("I have a heavy heart today")).toBe("sad");
  });

  it("maps 'mind is racing' to anxious", () => {
    expect(mapCulturalIdiom("my mind is racing nonstop")).toBe("anxious");
  });

  it("maps 'boiling inside' to angry", () => {
    expect(mapCulturalIdiom("I am boiling inside")).toBe("angry");
  });

  it("maps 'heart is sinking' to sad", () => {
    expect(mapCulturalIdiom("my heart is sinking")).toBe("sad");
  });

  it("maps 'no peace' to anxious", () => {
    expect(mapCulturalIdiom("I have no peace in my mind")).toBe("anxious");
  });

  it("maps 'restless' to restless", () => {
    expect(mapCulturalIdiom("I feel so restless inside")).toBe("restless");
  });

  it("returns null for non-idiom text", () => {
    expect(mapCulturalIdiom("I am happy today")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(mapCulturalIdiom("")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(mapCulturalIdiom("My Mind Is Racing")).toBe("anxious");
  });
});

describe("isCulturalIdiom", () => {
  it("returns true for idiomatic text", () => {
    expect(isCulturalIdiom("I have so much tension")).toBe(true);
  });

  it("returns false for non-idiomatic text", () => {
    expect(isCulturalIdiom("I am happy")).toBe(false);
  });
});

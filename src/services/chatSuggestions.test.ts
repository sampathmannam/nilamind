import { describe, it, expect } from "vitest";
import { timeSlot, getSuggestions } from "./chatSuggestions";

describe("chatSuggestions", () => {
  it("timeSlot returns correct slot for each hour", () => {
    expect(timeSlot(3)).toBe("night");
    expect(timeSlot(7)).toBe("night");
    expect(timeSlot(8)).toBe("morning");
    expect(timeSlot(11)).toBe("morning");
    expect(timeSlot(12)).toBe("day");
    expect(timeSlot(16)).toBe("day");
    expect(timeSlot(17)).toBe("evening");
    expect(timeSlot(20)).toBe("evening");
    expect(timeSlot(21)).toBe("night");
    expect(timeSlot(23)).toBe("night");
  });

  it("getSuggestions returns 3 chips for a given slot", () => {
    const chips = getSuggestions("morning");
    expect(chips).toHaveLength(3);
    expect(chips[0].id).toMatch(/^am_/);
    expect(chips.every((c) => c.text && c.emoji)).toBe(true);
  });

  it("adapts first chip when recent mood is intense", () => {
    const chips = getSuggestions("day", { intensity: 9, emotion: "Anxious" });
    expect(chips[0].id).toBe("elevated");
  });

  it("adapts first chip when recent mood is very low", () => {
    const chips = getSuggestions("day", { intensity: 2, emotion: "Low" });
    expect(chips[0].id).toBe("low");
  });

  it("does not modify chips when mood is moderate", () => {
    const chips = getSuggestions("day", { intensity: 5, emotion: "Okay" });
    expect(chips[0].id).not.toBe("elevated");
    expect(chips[0].id).not.toBe("low");
  });
});

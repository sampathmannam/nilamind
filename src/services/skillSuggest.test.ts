import { describe, it, expect } from "vitest";
import { suggestSkill } from "./skillSuggest";

describe("suggestSkill", () => {
  it("returns null for empty message", () => {
    expect(suggestSkill("")).toBeNull();
  });

  it("suggests a crisis skill for panic", () => {
    const s = suggestSkill("i'm having a panic attack my heart is racing");
    expect(s).not.toBeNull();
    expect(s!.skill.group).toBe("crisis");
    expect(s!.reason).toContain("Racing heart");
  });

  it("suggests a mindfulness skill for racing thoughts", () => {
    const s = suggestSkill("i can't stop overthinking everything");
    expect(s).not.toBeNull();
    expect(s!.skill.group).toBe("mindfulness");
  });

  it("suggests compassion skill for self-criticism", () => {
    const s = suggestSkill("i'm such a failure, i hate myself");
    expect(s).not.toBeNull();
    expect(s!.skill.group).toBe("compassion");
  });

  it("suggests emotion regulation for low mood", () => {
    const s = suggestSkill("i feel so empty and sad today");
    expect(s).not.toBeNull();
    expect(s!.skill.group).toBe("emotion");
  });

  it("does NOT suggest when crisis is detected", () => {
    expect(suggestSkill("i want to kill myself")).toBeNull();
    expect(suggestSkill("i'm going to overdose")).toBeNull();
  });

  it("returns null for benign messages", () => {
    expect(suggestSkill("hello, how are you?")).toBeNull();
  });
});

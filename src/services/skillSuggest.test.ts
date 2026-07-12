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

  // Clinical research upgrades wave 2 (2026-07-12), Task E — matched, relevant routing is the one
  // personalization that works; skills-use mediation only operates when the RELEVANT skill is practiced, per
  // Neacsiu, Rizvi & Linehan (2010), Behaviour Research and Therapy. Before this fix, every signal in a group
  // always resolved to skills[0] of that group regardless of which specific signal fired.
  describe("per-signal skill mapping (not always skills[0] of the matched group)", () => {
    it("routes panic/racing-heart specifically to TIPP", () => {
      const s = suggestSkill("i'm having a panic attack, my heart is racing");
      expect(s!.skill.id).toBe("tipp");
    });

    it("routes a DIFFERENT crisis signal (overwhelm) to a DIFFERENT skill than panic", () => {
      const panic = suggestSkill("racing heart, chest tight");
      const overwhelmed = suggestSkill("it's all too much, everything at once, i can't cope");
      expect(panic!.skill.group).toBe("crisis");
      expect(overwhelmed!.skill.group).toBe("crisis");
      expect(overwhelmed!.skill.id).not.toBe(panic!.skill.id);
    });

    it("routes anger and fear (both 'emotion' group) to DIFFERENT skills", () => {
      const anger = suggestSkill("i feel so angry and furious, resentful too");
      const fear = suggestSkill("i'm so scared and terrified, dreading this");
      expect(anger!.skill.group).toBe("emotion");
      expect(fear!.skill.group).toBe("emotion");
      expect(anger!.skill.id).not.toBe(fear!.skill.id);
    });

    it("routes a thinking-trap signal to Spot the Thinking Trap specifically", () => {
      const s = suggestSkill("this is such black and white thinking, all or nothing");
      expect(s!.skill.id).toBe("spot-distortion");
    });

    it("routes catastrophic what-if worry to Scheduled Worry Time specifically", () => {
      const s = suggestSkill("what if something bad happens, worst case scenario");
      expect(s!.skill.id).toBe("worry-time");
    });

    it("routes low-energy / scattered cues to Accumulate Pleasant Events (BA)", () => {
      const s = suggestSkill("i can't get started on anything, i feel so worn out");
      expect(s!.skill.id).toBe("accumulate-positive");
    });

    it("routes scattered / can't-settle cues to the 3-Minute Breathing Space (MBCT)", () => {
      const s = suggestSkill("my mind is scattered and i feel off task");
      expect(s!.skill.id).toBe("breathing-space");
    });

    it("routes loneliness / disconnection cues to the compassionate-self skill", () => {
      const s = suggestSkill("i feel so lonely and disconnected from everyone");
      expect(s!.skill.id).toBe("compassionate-self");
    });
  });
});

import { describe, it, expect } from "vitest";
import { skillForEmotion, SKILLS, getSkill } from "./skillsLibrary";

// Clinical research upgrades wave 2 (2026-07-12), Task D — route chronic-worry language away from TIPP toward
// worry-specific tools. TIPP is a crisis-intensity (8–10/10) DBT distress-tolerance skill (Linehan, 2015); an
// intensity mismatch for ordinary GAD-style worry. Worry-specific alternative per Borkovec, Wilkinson,
// Folensbee & Lerman (1983).
describe("skillForEmotion — worry routes to a worry-specific tool, not TIPP (Task D)", () => {
  it("routes 'worried' to the Scheduled Worry Time skill, not TIPP", () => {
    const s = skillForEmotion("Worried");
    expect(s).not.toBeNull();
    expect(s!.id).not.toBe("tipp");
    expect(s!.id).toBe("worry-time");
  });

  it("routes 'worry' / 'worrying' to worry-time as well", () => {
    expect(skillForEmotion("worrying")?.id).toBe("worry-time");
    expect(skillForEmotion("worry")?.id).toBe("worry-time");
  });

  it("still routes acute panic/high-arousal fear to TIPP (crisis-intensity match preserved)", () => {
    expect(skillForEmotion("panicked")?.id).toBe("tipp");
    expect(skillForEmotion("anxious")?.id).toBe("tipp");
    expect(skillForEmotion("scared")?.id).toBe("tipp");
  });

  it("the worry-time skill exists in the library and cites Borkovec et al. (1983)", () => {
    const skill = getSkill("worry-time");
    expect(skill).toBeTruthy();
    expect(skill!.basis.toLowerCase()).toContain("borkovec");
  });
});

describe("skillsLibrary — Wise Mind honest-expectation framing (Task E)", () => {
  it("Wise Mind states a small, repetition-dependent, never-symptom-treatment expectation (Schumer, Lindsay & Creswell, 2018)", () => {
    const wiseMind = SKILLS.find((s) => s.id === "wise-mind")!;
    const text = (wiseMind.purpose + " " + wiseMind.steps.join(" ") + " " + wiseMind.basis).toLowerCase();
    expect(text).toMatch(/helps a little|small effect|with repetition|modest/);
    expect(text).not.toMatch(/treats|cures|proven to (reduce|fix)/);
  });
});

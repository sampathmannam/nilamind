import { describe, it, expect } from "vitest";
import { pmrState, pmrProgress, pmrTotalMs, allMuscleGroups, getMuscleGroup, TENSE_SECONDS, RELEASE_SECONDS } from "./pmrPacer";

// Paired Muscle Relaxation pacer — same phase-cursor shape as breathPacer.ts (2026-07-12 Wave 3,
// Group E: TIPP tool). Jacobson (1938) tense-then-release, paired with breath in DBT's adaptation
// (tense on inhale, release on exhale); Manzoni et al. (2008, BMC Psychiatry) d≈0.57–0.68.
// Abbreviated 6-group set per spec: hands & forearms → biceps → shoulders & neck → face → abdomen →
// legs & feet. Unlike breathPacer (which loops forever), PMR is a single finite pass through the groups.
describe("pmrPacer", () => {
  it("has exactly 6 muscle groups in the documented order", () => {
    const groups = allMuscleGroups();
    expect(groups.length).toBe(6);
    expect(groups[0]).toBe("handsForearms");
    expect(groups[1]).toBe("biceps");
    expect(groups[2]).toBe("shouldersNeck");
    expect(groups[3]).toBe("face");
    expect(groups[4]).toBe("abdomen");
    expect(groups[5]).toBe("legsFeet");
  });

  it("every group has a label, a tense cue, and a release cue", () => {
    for (const g of allMuscleGroups()) {
      const cfg = getMuscleGroup(g);
      expect(cfg.label.length).toBeGreaterThan(0);
      expect(cfg.tenseCue.length).toBeGreaterThan(0);
      expect(cfg.releaseCue.length).toBeGreaterThan(0);
    }
  });

  it("tense is ~5s, release is ~10s (per spec doc §3)", () => {
    expect(TENSE_SECONDS).toBe(5);
    expect(RELEASE_SECONDS).toBe(10);
  });

  it("starts on group 0, phase tense, at elapsed 0", () => {
    const s = pmrState(0);
    expect(s.groupIndex).toBe(0);
    expect(s.phase).toBe("tense");
    expect(s.done).toBe(false);
  });

  it("moves from tense to release within the same group after TENSE_SECONDS", () => {
    const tenseMs = TENSE_SECONDS * 1000;
    expect(pmrState(tenseMs - 1).phase).toBe("tense");
    expect(pmrState(tenseMs).phase).toBe("release");
    expect(pmrState(tenseMs).groupIndex).toBe(0);
  });

  it("advances to the next group's tense phase after tense+release of the previous group", () => {
    const groupMs = (TENSE_SECONDS + RELEASE_SECONDS) * 1000;
    expect(pmrState(groupMs - 1).groupIndex).toBe(0);
    expect(pmrState(groupMs).groupIndex).toBe(1);
    expect(pmrState(groupMs).phase).toBe("tense");
  });

  it("does NOT loop — after all 6 groups it reports done:true and stays on the last group", () => {
    const total = pmrTotalMs();
    const s = pmrState(total);
    expect(s.done).toBe(true);
    expect(s.groupIndex).toBe(5);
    const sLater = pmrState(total + 60_000);
    expect(sLater.done).toBe(true);
    expect(sLater.groupIndex).toBe(5);
  });

  it("progress within phase goes 0→1", () => {
    const halfTense = (TENSE_SECONDS * 1000) / 2;
    const s = pmrState(halfTense);
    expect(s.phase).toBe("tense");
    expect(s.progress).toBeCloseTo(0.5, 1);
  });

  it("pmrProgress (whole-session 0-1) is 0 at start, 1 when done, and monotonically increases", () => {
    const total = pmrTotalMs();
    expect(pmrProgress(0)).toBe(0);
    expect(pmrProgress(total)).toBe(1);
    expect(pmrProgress(total / 2)).toBeGreaterThan(0);
    expect(pmrProgress(total / 2)).toBeLessThan(1);
    expect(pmrProgress(total + 10_000)).toBe(1); // clamped, doesn't overshoot
  });

  it("cue text matches the current phase (tense cue during tense, release cue during release)", () => {
    const tenseMs = TENSE_SECONDS * 1000;
    const s1 = pmrState(0);
    expect(s1.cue).toBe(getMuscleGroup(s1.group.id).tenseCue);
    const s2 = pmrState(tenseMs);
    expect(s2.cue).toBe(getMuscleGroup(s2.group.id).releaseCue);
  });

  it("pmrTotalMs equals 6 groups * (tense+release)", () => {
    expect(pmrTotalMs()).toBe(6 * (TENSE_SECONDS + RELEASE_SECONDS) * 1000);
  });
});

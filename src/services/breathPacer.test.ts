import { describe, it, expect } from "vitest";
import { breathState, cycleProgress, getBreathPattern, allBreathPatterns } from "./breathPacer";

describe("breathPacer", () => {
  it("getBreathPattern returns config for each pattern", () => {
    for (const p of allBreathPatterns()) {
      const cfg = getBreathPattern(p);
      expect(cfg.inhale).toBeGreaterThan(0);
      expect(cfg.exhale).toBeGreaterThan(0);
    }
  });

  it("box breathing cycles through inhale→hold→exhale→hold2", () => {
    const cfg = getBreathPattern("box");
    const totalMs = (cfg.inhale + cfg.hold + cfg.exhale + cfg.hold2) * 1000; // 16000ms
    expect(breathState("box", 0, 0).phase).toBe("inhale");
    expect(breathState("box", 3999, 0).phase).toBe("inhale");
    expect(breathState("box", 4000, 0).phase).toBe("hold");
    expect(breathState("box", 7999, 0).phase).toBe("hold");
    expect(breathState("box", 8000, 0).phase).toBe("exhale");
    expect(breathState("box", 11999, 0).phase).toBe("exhale");
    expect(breathState("box", 12000, 0).phase).toBe("hold2");
    expect(breathState("box", 15999, 0).phase).toBe("hold2");
    // wraps to next cycle
    expect(breathState("box", 16000, 0).phase).toBe("inhale");
  });

  it("4-7-8 has no post-exhale hold", () => {
    const cfg = getBreathPattern("478");
    expect(cfg.hold2).toBe(0);
    const totalMs = (cfg.inhale + cfg.hold + cfg.exhale) * 1000; // 19000ms
    expect(breathState("478", 0, 0).phase).toBe("inhale");
    expect(breathState("478", 4000, 0).phase).toBe("hold");
    expect(breathState("478", 11000, 0).phase).toBe("exhale");
    expect(breathState("478", 19000, 0).phase).toBe("inhale"); // wraps
  });

  it("5-5 has no hold phases", () => {
    expect(breathState("55", 0, 0).phase).toBe("inhale");
    expect(breathState("55", 5000, 0).phase).toBe("exhale");
    expect(breathState("55", 10000, 0).phase).toBe("inhale");
  });

  it("progress within phase goes 0→1", () => {
    const s = breathState("box", 2000, 0); // halfway through inhale
    expect(s.phase).toBe("inhale");
    expect(s.progress).toBeCloseTo(0.5, 1);
  });

  it("cycleProgress wraps per cycle", () => {
    const total = 16000; // box
    expect(cycleProgress(0, "box")).toBe(0);
    expect(cycleProgress(8000, "box")).toBeCloseTo(0.5, 1);
    expect(cycleProgress(16000, "box")).toBe(0);
  });

  it("cycleIndex increments correctly", () => {
    expect(breathState("box", 0, 0).cycleIndex).toBe(0);
    expect(breathState("box", 32000, 1).cycleIndex).toBe(1);
  });

  describe("cyclic sighing (Balban, Neri, Kogon et al. 2023)", () => {
    it("is registered as a pattern with a double-inhale phase and a long exhale", () => {
      const cfg = getBreathPattern("cyclicSighing");
      expect(cfg.inhale).toBeGreaterThan(0);
      expect(cfg.inhale2).toBeGreaterThan(0); // the second, sharp top-up inhale is the defining feature
      expect(cfg.exhale).toBeGreaterThan(cfg.inhale + cfg.inhale2); // exhale is the long phase
    });

    it("cycles inhale -> inhale2 -> exhale, with no holds", () => {
      const cfg = getBreathPattern("cyclicSighing");
      expect(cfg.hold).toBe(0);
      expect(cfg.hold2).toBe(0);
      const inhaleMs = cfg.inhale * 1000;
      const inhale2Ms = cfg.inhale2 * 1000;
      expect(breathState("cyclicSighing", 0, 0).phase).toBe("inhale");
      expect(breathState("cyclicSighing", inhaleMs, 0).phase).toBe("inhale2");
      expect(breathState("cyclicSighing", inhaleMs + inhale2Ms, 0).phase).toBe("exhale");
    });

    it("is prioritized first in the pattern list (acute-episode path)", () => {
      expect(allBreathPatterns()[0]).toBe("cyclicSighing");
    });
  });

  describe("resonance-frequency breathing relabel (Goessl, Curtiss & Hofmann 2017; Lehrer & Gevirtz 2014)", () => {
    it("the '55' pattern is labelled/named as resonance-frequency breathing, not generic 'calm'", () => {
      const cfg = getBreathPattern("55");
      expect(cfg.name.toLowerCase()).toContain("resonance");
      expect(cfg.label.toLowerCase()).toContain("resonance");
    });

    it("is mathematically ~6 breaths/min (5s in + 5s out = 12 cycles/min)", () => {
      const cfg = getBreathPattern("55");
      const cycleSeconds = cfg.inhale + cfg.hold + cfg.exhale + cfg.hold2;
      expect(Math.round(60 / cycleSeconds)).toBe(6);
    });
  });
});

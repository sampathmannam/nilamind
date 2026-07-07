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
});

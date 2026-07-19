import { describe, it, expect } from "vitest";
import { valenceToColor, NO_DATA_COLOR } from "./affectToneColor";

describe("valenceToColor — orb-palette warm gradient, never rose", () => {
  it("valenceToColor(-1) equals the orb's negative-tint deep mauve exactly", () => {
    expect(valenceToColor(-1)).toBe("#b06aa0");
  });

  it("valenceToColor(0) equals the orb's resting identity color exactly", () => {
    expect(valenceToColor(0)).toBe("#c784b0");
  });

  it("valenceToColor(1) equals the orb's positive-tint cream exactly", () => {
    expect(valenceToColor(1)).toBe("#fdefdc");
  });

  it("clamps values outside [-1, 1]", () => {
    expect(valenceToColor(-5)).toBe(valenceToColor(-1));
    expect(valenceToColor(5)).toBe(valenceToColor(1));
  });

  it("interpolates distinctly between the three stops", () => {
    const negSide = valenceToColor(-0.5);
    const posSide = valenceToColor(0.5);
    expect(negSide).not.toBe(valenceToColor(-1));
    expect(negSide).not.toBe(valenceToColor(0));
    expect(posSide).not.toBe(valenceToColor(0));
    expect(posSide).not.toBe(valenceToColor(1));
  });

  it("NEVER produces a color close to the app's reserved crisis-red hue, across the whole range", () => {
    const crisisR = 0xbe, crisisG = 0x3f, crisisB = 0x26;
    for (let v = -1; v <= 1; v += 0.05) {
      const hex = valenceToColor(v);
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const dist = Math.sqrt((r - crisisR) ** 2 + (g - crisisG) ** 2 + (b - crisisB) ** 2);
      expect(dist).toBeGreaterThan(100);
    }
  });

  it("NO_DATA_COLOR matches MoodHeatmap's own empty-slot convention", () => {
    expect(NO_DATA_COLOR).toBe("var(--color-slate-800)");
  });
});

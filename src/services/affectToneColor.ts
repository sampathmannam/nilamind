// Three-stop warm gradient built exclusively from the orb's own accent palette (NilaFace.tsx) — never
// rose, which this codebase reserves exclusively as the crisis safety signal.
const NEGATIVE = "#b06aa0";
const NEUTRAL = "#c784b0";
const POSITIVE = "#fdefdc";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function valenceToColor(valence: number): string {
  const clamped = Math.max(-1, Math.min(1, valence));
  const [fromHex, toHex, t] =
    clamped < 0 ? [NEGATIVE, NEUTRAL, clamped + 1] : [NEUTRAL, POSITIVE, clamped];
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  return rgbToHex([lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)]);
}

export const NO_DATA_COLOR = "var(--color-slate-800)";

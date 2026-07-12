import { vi, describe, it, expect, beforeEach } from "vitest";
const ls = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
  setItem: (k: string, v: string) => { ls.set(k, String(v)); },
  removeItem: (k: string) => { ls.delete(k); },
});
import { getEmaEnabled, setEmaEnabled, getEmaFrequency, setEmaFrequency } from "./emaPrefs";

beforeEach(() => ls.clear());

// EMA is designed opt-in-by-default (top-of-file comment). Actual notifications stay fully gated
// behind OS notification permission and never surprise-prompt at app boot (App.tsx calls
// syncEmaCheckins({ request: false }) on open) — so a true default here doesn't itself start
// pestering anyone; it only changes what the Settings toggle shows until the user acts.
describe("emaPrefs", () => {
  it("defaults getEmaEnabled to true (opt-in-by-default, matching the file's own documented intent)", () => {
    expect(getEmaEnabled()).toBe(true);
  });

  it("round-trips on/off", () => {
    setEmaEnabled(false);
    expect(getEmaEnabled()).toBe(false);
    setEmaEnabled(true);
    expect(getEmaEnabled()).toBe(true);
  });

  it("defaults frequency to 2/day, inside the 2-3/day best-compliance band (Wen, Schneider, Stone & Spruijt-Metz, 2017)", () => {
    expect(getEmaFrequency()).toBe(2);
  });

  it("clamps set frequency to the [1,3] cap", () => {
    setEmaFrequency(10);
    expect(getEmaFrequency()).toBe(3);
    setEmaFrequency(0);
    expect(getEmaFrequency()).toBe(1);
  });
});

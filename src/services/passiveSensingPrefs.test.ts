// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
const ls = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
  setItem: (k: string, v: string) => { ls.set(k, String(v)); },
  removeItem: (k: string) => { ls.delete(k); },
  clear: () => { ls.clear(); },
});
import { getPassiveSensingEnabled, setPassiveSensingEnabled } from "./passiveSensingPrefs";

beforeEach(() => ls.clear());

describe("passiveSensingPrefs", () => {
  it("returns false by default", () => {
    expect(getPassiveSensingEnabled()).toBe(false);
  });

  it("returns true after enabling", () => {
    setPassiveSensingEnabled(true);
    expect(getPassiveSensingEnabled()).toBe(true);
  });

  it("returns false after disabling", () => {
    setPassiveSensingEnabled(true);
    setPassiveSensingEnabled(false);
    expect(getPassiveSensingEnabled()).toBe(false);
  });
});
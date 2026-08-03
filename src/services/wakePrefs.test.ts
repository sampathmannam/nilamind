import { vi, describe, it, expect, beforeEach } from "vitest";

const ls = new Map<string, string>();
vi.mock("./storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
    setItem: (k: string, v: string) => { ls.set(k, String(v)); },
    removeItem: (k: string) => { ls.delete(k); },
  }),
}));

import { getWakeEnabled, setWakeEnabled } from "./wakePrefs";

beforeEach(() => ls.clear());

describe("wakePrefs", () => {
  it("returns false by default (opt-in, off by default)", () => {
    expect(getWakeEnabled()).toBe(false);
  });

  it("returns true after setWakeEnabled(true)", () => {
    setWakeEnabled(true);
    expect(getWakeEnabled()).toBe(true);
  });

  it("returns false after setWakeEnabled(false)", () => {
    setWakeEnabled(true);
    setWakeEnabled(false);
    expect(getWakeEnabled()).toBe(false);
  });

  it("round-trips on/off", () => {
    setWakeEnabled(true);
    expect(getWakeEnabled()).toBe(true);
    setWakeEnabled(false);
    expect(getWakeEnabled()).toBe(false);
    setWakeEnabled(true);
    expect(getWakeEnabled()).toBe(true);
  });

  it("returns false when stored value is corrupted", () => {
    ls.set("nilamind_wakeword", "not-a-valid-value");
    expect(getWakeEnabled()).toBe(false);
  });
});

import { vi, describe, it, expect, beforeEach } from "vitest";
const ls = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
  setItem: (k: string, v: string) => { ls.set(k, String(v)); },
  removeItem: (k: string) => { ls.delete(k); },
});
import { getInflectionEnabled, setInflectionEnabled } from "./inflectionPrefs";

beforeEach(() => ls.clear());
describe("inflectionPrefs", () => {
  it("defaults OFF", () => { expect(getInflectionEnabled()).toBe(false); });
  it("round-trips on/off", () => {
    setInflectionEnabled(true); expect(getInflectionEnabled()).toBe(true);
    setInflectionEnabled(false); expect(getInflectionEnabled()).toBe(false);
  });
});

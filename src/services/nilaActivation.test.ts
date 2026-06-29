import { describe, it, expect } from "vitest";
import { canSummon } from "./nilaActivation";

describe("canSummon", () => {
  const base = { callOpen: false, now: 10_000, lastSummonAt: 0, cooldownMs: 1500 };
  it("allows when idle and past cooldown", () => { expect(canSummon(base)).toBe(true); });
  it("blocks while a call is open", () => { expect(canSummon({ ...base, callOpen: true })).toBe(false); });
  it("blocks within the cooldown window", () => { expect(canSummon({ ...base, now: 10_500, lastSummonAt: 10_000 })).toBe(false); });
  it("allows after the cooldown elapses", () => { expect(canSummon({ ...base, now: 12_000, lastSummonAt: 10_000 })).toBe(true); });
  it("allows at the exact cooldown boundary", () => { expect(canSummon({ callOpen: false, now: 11_500, lastSummonAt: 10_000, cooldownMs: 1500 })).toBe(true); });
  it("uses the default 1500ms cooldown when cooldownMs is omitted", () => { expect(canSummon({ callOpen: false, now: 11_500, lastSummonAt: 10_000 })).toBe(true); expect(canSummon({ callOpen: false, now: 11_499, lastSummonAt: 10_000 })).toBe(false); });
});

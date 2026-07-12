import { describe, it, expect, beforeEach } from "vitest";
import { getSensoryComfort, setSensoryComfort } from "./sensoryComfort";
import { secureLocal } from "./secureLocal";

describe("sensoryComfort", () => {
  beforeEach(() => {
    secureLocal.removeItem("nilamind_sensory_comfort");
  });

  it("defaults to off when nothing is stored", () => {
    expect(getSensoryComfort()).toBe(false);
  });

  it("round-trips the on/off flag", () => {
    setSensoryComfort(true);
    expect(getSensoryComfort()).toBe(true);
    setSensoryComfort(false);
    expect(getSensoryComfort()).toBe(false);
  });

  it("tolerates a storage read failure by returning false", () => {
    const real = secureLocal.getItem;
    (secureLocal as any).getItem = () => { throw new Error("boom"); };
    expect(getSensoryComfort()).toBe(false);
    (secureLocal as any).getItem = real;
  });
});

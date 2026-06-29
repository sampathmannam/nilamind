import { describe, it, expect } from "vitest";
import { resolveInitialInstrument } from "./assessmentInitial";

describe("resolveInitialInstrument", () => {
  it("returns null when no initialInstrument is given (menu phase)", () => {
    expect(resolveInitialInstrument(undefined)).toBeNull();
  });

  it("returns the instrument id for a valid PHQ-9 launch", () => {
    expect(resolveInitialInstrument("PHQ-9")).toBe("PHQ-9");
  });

  it("returns the instrument id for a valid GAD-7 launch", () => {
    expect(resolveInitialInstrument("GAD-7")).toBe("GAD-7");
  });

  it("returns null for an id not in INSTRUMENTS (defensive fall-through to menu)", () => {
    // @ts-expect-error intentionally passing an invalid id to prove the guard
    expect(resolveInitialInstrument("NOPE")).toBeNull();
  });
});

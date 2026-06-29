import { describe, it, expect } from "vitest";
import { mapBiometryToAvailable } from "./biometricGate";

describe("mapBiometryToAvailable", () => {
  it("true when a biometric is enrolled", () => {
    expect(mapBiometryToAvailable({ isAvailable: true, deviceIsSecure: true })).toBe(true);
  });
  it("true when no biometric but the device has a secure lock (PIN/pattern)", () => {
    expect(mapBiometryToAvailable({ isAvailable: false, deviceIsSecure: true })).toBe(true);
  });
  it("false when no biometric and no secure lock", () => {
    expect(mapBiometryToAvailable({ isAvailable: false, deviceIsSecure: false })).toBe(false);
  });
  it("false when deviceIsSecure is missing and not available", () => {
    expect(mapBiometryToAvailable({ isAvailable: false })).toBe(false);
  });
});

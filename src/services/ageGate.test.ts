import { describe, it, expect, beforeEach } from "vitest";
import { isAgeConfirmed, confirmAdult } from "./ageGate";

// Compliance (2026 audit): every major AI-mental-health lawsuit centers on a MINOR; 18+ is the defensible
// default for a solo operator, and a self-attestation is the standard for a wellness (non-clinical) app.
describe("ageGate — one-time 18+ self-attestation", () => {
  beforeEach(() => {
    const m = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
      setItem: (k: string, v: string) => { m.set(k, v); },
      removeItem: (k: string) => { m.delete(k); },
    };
  });
  it("is not confirmed by default (a new user must attest)", () => {
    expect(isAgeConfirmed()).toBe(false);
  });
  it("confirmAdult() persists the confirmation across reads", () => {
    confirmAdult();
    expect(isAgeConfirmed()).toBe(true);
  });
});

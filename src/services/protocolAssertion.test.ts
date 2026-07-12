import { describe, it, expect } from "vitest";
import { ASSERTION_TRAINING } from "./protocolAssertion";
import { getProtocol, routeToProtocol } from "./protocols";

const VALID_KINDS = ["psychoed", "reflect", "plan", "exercise"] as const;

describe("ASSERTION_TRAINING protocol", () => {
  const p = ASSERTION_TRAINING;

  it("has a valid id, title, and basis", () => {
    expect(p.id).toBe("assertion-training");
    expect(p.title.length).toBeGreaterThan(0);
    expect(p.basis.length).toBeGreaterThan(20);
  });

  it("has at least one forConcerns entry", () => {
    expect(p.forConcerns.length).toBeGreaterThan(0);
  });

  it("has at least 5 steps", () => {
    expect(p.steps.length).toBeGreaterThanOrEqual(5);
  });

  it("every step has valid id, kind, title, and prompt", () => {
    for (const s of p.steps) {
      expect(s.id).toBeTruthy();
      expect(s.id.startsWith("as-")).toBe(true);
      expect(VALID_KINDS).toContain(s.kind);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.prompt.length).toBeGreaterThan(10);
    }
  });

  it("has unique step IDs", () => {
    const ids = p.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("references at least one DBT interpersonal skill (DEAR MAN, GIVE, or FAST)", () => {
    const combined = p.steps.map((s) => (s.prompt + " " + s.title).toLowerCase()).join(" ");
    expect(combined).toMatch(/dear man|give |fast |interpersonal/i);
  });

  it("includes a values-aligned script practice step", () => {
    const combined = p.steps.map((s) => (s.prompt + " " + s.title).toLowerCase()).join(" ");
    expect(combined).toMatch(/script|say it|practice|role.?play|phrase|wording/i);
  });

  it("is registered in PROTOCOLS and retrievable by id", () => {
    const retrieved = getProtocol("assertion-training");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("assertion-training");
  });

  it("routes for assertion-relevant concerns", () => {
    const matches = [
      "can't say no", "people pleasing",
      "afraid to speak up", "setting boundaries",
      "too passive",
    ];
    for (const m of matches) {
      const result = routeToProtocol(m);
      expect(result).not.toBeNull();
    }
  });

  it("ends with a reflect or plan step", () => {
    const last = p.steps[p.steps.length - 1];
    expect(["reflect", "plan"]).toContain(last.kind);
  });
});

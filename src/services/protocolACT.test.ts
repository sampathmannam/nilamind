import { describe, it, expect } from "vitest";
import { ACT_TRAINING } from "./protocolACT";
import { getProtocol, routeToProtocol } from "./protocols";
import type { Protocol } from "./protocols";

const VALID_KINDS = ["psychoed", "reflect", "plan", "exercise"] as const;

describe("ACT_TRAINING protocol", () => {
  const p = ACT_TRAINING;

  it("has a valid id, title, and basis", () => {
    expect(p.id).toBe("act-training");
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
      expect(s.id.startsWith("act-")).toBe(true);
      expect(VALID_KINDS).toContain(s.kind);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.prompt.length).toBeGreaterThan(10);
    }
  });

  it("has unique step IDs", () => {
    const ids = p.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all six core ACT processes", () => {
    const combined = p.steps.map((s) => (s.prompt + " " + s.title).toLowerCase()).join(" ");
    const processes = ["acceptance", "defusion", "present moment", "values", "committed action", "self as context"];
    const found = processes.filter((proc) => combined.includes(proc));
    expect(found.length).toBeGreaterThanOrEqual(4);
  });

  it("includes at least one acceptance exercise", () => {
    const combined = p.steps.map((s) => (s.prompt + " " + s.title).toLowerCase()).join(" ");
    expect(combined).toMatch(/make room|breathe into|let it be|willingness|accept/i);
  });

  it("includes a committed action planning step", () => {
    const prompts = p.steps.map((s) => s.prompt.toLowerCase()).join(" ");
    expect(prompts).toMatch(/small step|toward move|commit|action/i);
  });

  it("is registered in PROTOCOLS and retrievable by id", () => {
    const retrieved = getProtocol("act-training");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("act-training");
  });

  it("routes for ACT-relevant concerns", () => {
    const matches = [
      "stuck in my head", "can't stop thinking", "avoiding my feelings",
      "don't know what matters", "feelings are too much", "fighting my emotions",
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

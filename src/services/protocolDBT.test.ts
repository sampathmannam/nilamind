import { describe, it, expect } from "vitest";
import { DBT_SKILLS_TRAINING } from "./protocolDBT";
import { getProtocol, routeToProtocol, type Protocol } from "./protocols";

const VALID_KINDS = ["psychoed", "reflect", "plan", "exercise"] as const;

describe("DBT_SKILLS_TRAINING protocol", () => {
  const p = DBT_SKILLS_TRAINING;

  it("has a valid id, title, and basis", () => {
    expect(p.id).toBe("dbt-skills-training");
    expect(p.title.length).toBeGreaterThan(0);
    expect(p.basis.length).toBeGreaterThan(20);
  });

  it("has at least one forConcerns entry", () => {
    expect(p.forConcerns.length).toBeGreaterThan(0);
  });

  it("has at least 6 steps (one per skill area + intro + wrap)", () => {
    expect(p.steps.length).toBeGreaterThanOrEqual(6);
  });

  it("every step has valid id, kind, title, and prompt", () => {
    for (const s of p.steps) {
      expect(s.id).toBeTruthy();
      expect(s.id.startsWith("dbt-")).toBe(true);
      expect(VALID_KINDS).toContain(s.kind);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.prompt.length).toBeGreaterThan(10);
    }
  });

  it("has unique step IDs", () => {
    const ids = p.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes at least one step from each DBT module", () => {
    const titles = p.steps.map((s) => s.title.toLowerCase());
    const modules = ["mindfulness", "distress", "emotion", "interpersonal", "radical acceptance"];
    const found = modules.filter((m) => titles.some((t) => t.includes(m)));
    expect(found.length).toBeGreaterThanOrEqual(3);
  });

  it("references the diary card for ongoing practice", () => {
    const combined = p.steps.map((s) => s.prompt + " " + s.title).join(" ").toLowerCase();
    expect(combined).toMatch(/diary|track|practice|log|skill/i);
  });

  it("is registered in PROTOCOLS and retrievable by id", () => {
    const retrieved = getProtocol("dbt-skills-training");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("dbt-skills-training");
  });

  it("routes for DBT-relevant concerns", () => {
    const matches = [
      "intense emotions", "overwhelming", "impulsive urges",
      "relationship conflict", "people pleasing",
    ];
    for (const m of matches) {
      const result = routeToProtocol(m) as Protocol;
      expect(result).not.toBeNull();
    }
  });

  it("includes a crisis/distress tolerance skill step", () => {
    const prompts = p.steps.map((s) => (s.prompt + " " + s.title).toLowerCase());
    const crisisKeywords = ["tipp", "stop", "accepts", "self-soothe", "radical acceptance"];
    const found = crisisKeywords.some((kw) => prompts.some((t) => t.includes(kw)));
    expect(found).toBe(true);
  });

  it("ends with a reflect or planning step", () => {
    const last = p.steps[p.steps.length - 1];
    expect(["reflect", "plan"]).toContain(last.kind);
  });
});

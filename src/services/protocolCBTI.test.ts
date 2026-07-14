import { describe, it, expect } from "vitest";
import { CBTI_SLEEP } from "./protocolCBTI";
import { getProtocol } from "./protocols";

const VALID_KINDS = ["psychoed", "reflect", "plan", "exercise"] as const;

describe("CBTI_SLEEP protocol", () => {
  const p = CBTI_SLEEP;

  it("has a valid id, title, and basis", () => {
    expect(p.id).toBe("cbti-sleep");
    expect(p.title.length).toBeGreaterThan(0);
    expect(p.basis.length).toBeGreaterThan(20);
  });

  it("has at least one forConcerns entry", () => {
    expect(p.forConcerns.length).toBeGreaterThan(0);
  });

  it("has exactly 5 steps (psychoed, stimulus control, cognitive, consolidation, reflection)", () => {
    expect(p.steps).toHaveLength(5);
  });

  it("every step has valid id, kind, title, and prompt", () => {
    for (const s of p.steps) {
      expect(s.id).toBeTruthy();
      expect(s.id.startsWith("cbti-")).toBe(true);
      expect(VALID_KINDS).toContain(s.kind);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.prompt.length).toBeGreaterThan(10);
    }
  });

  it("has unique step IDs", () => {
    const ids = p.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all four core CBT-I components", () => {
    const combined = p.steps.map((s) => (s.title + " " + s.prompt).toLowerCase());
    const all = combined.join(" ");
    expect(all).toMatch(/stimulus|bed.*sleep|sleep.*bed|20 minute/i);
    expect(all).toMatch(/belief|thought|catastrophi|cogniti/i);
    expect(all).toMatch(/routine|habit|wind.?down/i);
    expect(all).toMatch(/drive|pressure|clock|circadian/i);
  });

  it("never mentions sleep restriction or reducing hours", () => {
    const combined = p.steps.map((s) => s.prompt).join(" ").toLowerCase();
    expect(combined).not.toMatch(/\bsleep restriction\b/);
    expect(combined).not.toMatch(/limit.*sleep|reduce.*sleep|cut.*sleep/i);
    expect(combined).not.toMatch(/sleep.*less|less.*sleep|restrict/i);
  });

  it("includes safety-aware consolidation (trim from 9h, not below 7h)", () => {
    const combined = p.steps.map((s) => s.prompt).join(" ");
    expect(combined).toMatch(/9 hours/);
    expect(combined).toMatch(/8\.5|8\b/);
  });

  it("is registered in PROTOCOLS and retrievable by id", () => {
    const retrieved = getProtocol("cbti-sleep");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("cbti-sleep");
    expect(retrieved!.title).toBe("Sleep Better (CBT-I)");
  });

  it("has sleep-specific forConcerns (unique to CBT-I, not generic insomnia)", () => {
    const unique = ["brain won't shut off", "sleep anxiety", "racing mind at night", "insomniac", "dread bedtime", "cant shut my brain off", "can't shut my brain off"];
    for (const u of unique) {
      expect(p.forConcerns).toContain(u);
    }
  });

  it("has a step that references the 20-minute stimulus control rule", () => {
    const stimulus = p.steps.find((s) => s.id === "cbti-2");
    expect(stimulus).toBeDefined();
    expect(stimulus!.prompt).toMatch(/20 minutes/);
    expect(stimulus!.kind).toBe("exercise");
  });

  it("has a step addressing unhelpful sleep beliefs (cognitive restructuring)", () => {
    const cognitive = p.steps.find((s) => s.id === "cbti-3");
    expect(cognitive).toBeDefined();
    expect(cognitive!.kind).toBe("reflect");
    expect(cognitive!.prompt).toMatch(/fall apart|never|need|catch up|belief/i);
  });

  it("basis references the AASM guideline or Edinger citation", () => {
    expect(p.basis).toMatch(/Edinger|AASM|first-line/i);
  });
});

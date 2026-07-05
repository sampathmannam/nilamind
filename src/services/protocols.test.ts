import { describe, it, expect } from "vitest";
import { PROTOCOLS, routeToProtocol, type Protocol } from "./protocols";

// Phase 1 — structured protocols + lightweight formulation-for-ROUTING. Research basis
// (docs/NILA_AGENT_RESEARCH_BASIS.md): STRUCTURE beats open chat; the one personalization that wins is modular
// MATCHING — route the presenting concern to the right evidence-based module (not a heavy idiographic engine).

describe("protocols — registry integrity", () => {
  it("every protocol is well-formed (id, title, basis, concerns, ≥3 ordered steps)", () => {
    expect(PROTOCOLS.length).toBeGreaterThanOrEqual(2);
    for (const p of PROTOCOLS) {
      expect(p.id).toBeTruthy();
      expect(p.title).toBeTruthy();
      expect(p.basis).toBeTruthy();              // research grounding is mandatory
      expect(p.forConcerns.length).toBeGreaterThan(0);
      expect(p.steps.length).toBeGreaterThanOrEqual(3);
      for (const s of p.steps) {
        expect(s.id).toBeTruthy();
        expect(["psychoed", "reflect", "plan", "exercise"]).toContain(s.kind);
        expect(s.prompt.length).toBeGreaterThan(10);
      }
    }
  });
  it("ids are unique (protocols and steps)", () => {
    const pids = PROTOCOLS.map((p) => p.id);
    expect(new Set(pids).size).toBe(pids.length);
    const sids = PROTOCOLS.flatMap((p) => p.steps.map((s) => s.id));
    expect(new Set(sids).size).toBe(sids.length);
  });
});

describe("routeToProtocol — modular matching (concern → the right evidence-based module)", () => {
  it("routes low-energy / anhedonia → Behavioral Activation", () => {
    const p = routeToProtocol("everything feels pointless and i have no energy anymore");
    expect(p?.id).toBe("behavioral-activation");
  });
  it("routes worry / rumination → Worry Postponement", () => {
    const p = routeToProtocol("i can't stop worrying, my mind keeps racing with what-ifs");
    expect(p?.id).toBe("worry-postponement");
  });
  it("routes self-criticism / shame → Self-Compassion", () => {
    const p = routeToProtocol("i hate myself, i'm always so harsh on myself lately");
    expect(p?.id).toBe("self-compassion");
  });
  it("returns null when no clinical concern is matched (never force a protocol)", () => {
    expect(routeToProtocol("what's the weather like today")).toBeNull();
    expect(routeToProtocol("")).toBeNull();
  });
  it("picks the STRONGER match when both could apply", () => {
    // more worry-signal than energy-signal → worry protocol
    const p = routeToProtocol("i'm so anxious and worried, overthinking everything, can't switch off");
    expect(p?.id).toBe("worry-postponement");
  });
});

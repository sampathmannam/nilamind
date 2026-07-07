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
  it("routes insomnia / lying awake at night → Sleep Wind-Down", () => {
    const p = routeToProtocol("i can't sleep, i lie awake for hours every night and i'm so exhausted");
    expect(p?.id).toBe("sleep-wind-down");
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

  it("routes social anxiety cues → Social Confidence", () => {
    const p = routeToProtocol("i'm terrified people will judge me, i avoid parties and meetings");
    expect(p?.id).toBe("social-confidence");
  });

  it("routes panic sensations → Panic Skills", () => {
    const p = routeToProtocol("my heart races, i can't breathe, it feels like i'm dying");
    expect(p?.id).toBe("panic-skills");
  });

  it("routes anger / irritability → Cooling Anger", () => {
    const p = routeToProtocol("i keep snapping at everyone, i feel furious over small things");
    expect(p?.id).toBe("cooling-anger");
  });

  it("routes flashbacks / dissociation → Grounding & Anchor", () => {
    const p = routeToProtocol("i had a flashback, i felt like i was back there, nothing feels real");
    expect(p?.id).toBe("grounding-anchor");
  });

  it("routes irregular sleep / schedule focus → Sleep Rhythm", () => {
    const p = routeToProtocol("my sleep schedule is all over the place, i wake up at different times every day");
    expect(p?.id).toBe("sleep-rhythm");
  });

  it("routes loneliness / isolation → Social Connection", () => {
    const p = routeToProtocol("i feel so alone, nobody understands me, i haven't talked to anyone in days");
    expect(p?.id).toBe("social-connection");
  });
});

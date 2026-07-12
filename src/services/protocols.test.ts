import { describe, it, expect } from "vitest";
import { PROTOCOLS, routeToProtocol, type Protocol, type ProtocolStep } from "./protocols";

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

  it("routes gratitude / positive focus → Gratitude Practice", () => {
    const p = routeToProtocol("i want to notice the good things, i feel like i only see the bad stuff");
    expect(p?.id).toBe("gratitude");
  });

  it("routes lost-purpose / 'what matters to me' → Values-Based Action", () => {
    const p = routeToProtocol("i've lost my sense of purpose, i don't know what matters to me anymore");
    expect(p?.id).toBe("values-action");
  });
});

// Clinical research upgrades wave 2 (2026-07-12) — Tasks C/D/E, docs/superpowers/plans/2026-07-12-clinical-
// research-synthesis.md (ba-pst, gad-worry, dbt-skills sections). Folded into EXISTING steps (not new step ids)
// to preserve the fixed 5-step sequencing other suites (protocolProgress.test.ts, activeProtocolContext.test.ts)
// depend on.
describe("protocols — clinical upgrades wave 2 (Task C/D/E)", () => {
  function step(protocolId: string, stepId: string): ProtocolStep {
    const p = PROTOCOLS.find((pr) => pr.id === protocolId)!;
    const s = p.steps.find((st) => st.id === stepId);
    if (!s) throw new Error(`step ${stepId} not found in ${protocolId}`);
    return s;
  }

  it("BA ba-2 names the TRAP→TRAC avoidance pattern (Jacobson, Martell & Dimidjian, 2001)", () => {
    const s = step("behavioral-activation", "ba-2");
    expect(s.prompt).toContain("TRAP");
    expect(s.prompt).toContain("TRAC");
    // the original reflect question must still be present — protocolChat.test.ts depends on this exact phrase
    expect(s.prompt).toContain("something you used to do");
  });

  it("BA ba-4 adds an if-then implementation-intention plan + a barrier-plan question (Gollwitzer & Sheeran, 2006)", () => {
    const s = step("behavioral-activation", "ba-4");
    expect(s.prompt.toLowerCase()).toContain("if ");
    expect(s.prompt.toLowerCase()).toContain("then i will");
    expect(s.prompt.toLowerCase()).toContain("get in the way");
  });

  it("worry-postponement wp-1 adds a solvable-vs-hypothetical worry triage (Borkovec, Wilkinson, Folensbee & Lerman, 1983)", () => {
    const s = step("worry-postponement", "wp-1");
    expect(s.prompt.toLowerCase()).toContain("solvable");
  });

  it("worry-postponement wp-3 reframes postponement as a metacognitive behavioral experiment (Krzikalla et al., 2024)", () => {
    const s = step("worry-postponement", "wp-3");
    expect(s.prompt.toLowerCase()).toContain("can't control");
  });

  it("cooling-anger ag-3 adds anti-rumination + a reappraisal micro-step (Pop, Nechita, Miu & Szentágotai-Tătar, 2025; Szasz, Szentagotai & Hofmann, 2011)", () => {
    const s = step("cooling-anger", "ag-3");
    expect(s.prompt.toLowerCase()).toContain("replay");
    expect(s.prompt.toLowerCase()).toMatch(/reappraisal|another way to see|different angle/);
  });

  it("worry-postponement still has exactly 5 steps (sequencing other suites hardcode)", () => {
    const p = PROTOCOLS.find((pr) => pr.id === "worry-postponement")!;
    expect(p.steps).toHaveLength(5);
  });

  it("behavioral-activation still has exactly 5 steps (sequencing other suites hardcode)", () => {
    const p = PROTOCOLS.find((pr) => pr.id === "behavioral-activation")!;
    expect(p.steps).toHaveLength(5);
  });
});

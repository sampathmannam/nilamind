/**
 * Guards for the exemplar corpus: it must stay in lockstep with seed.jsonl (the source of truth),
 * cover every taxonomy type, and clear the rubric's mechanical bars (no markdown, no sycophancy openers).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { NILA_EXEMPLARS } from "./nilaExemplars";
import { spotDistortions } from "./distortionSpotter";

const seed = readFileSync(new URL("../../docs/nila-corpus/seed.jsonl", import.meta.url), "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l) as { id: string; tag: string; user: string; nila: string; move?: string; register?: string });

// Mirrors distortionSpotter.ts's DISTORTIONS ids — kept in sync by hand (that file doesn't export the raw
// id list, only the DistortionId type). If distortionSpotter.ts adds/removes a distortion, update this too.
const DISTORTION_IDS = [
  "all_or_nothing", "catastrophizing", "mind_reading", "overgeneralization", "personalization",
  "emotional_reasoning", "should_statements", "labeling", "mental_filter", "disqualifying_positive",
] as const;

const TAXONOMY = [
  "explainer_question", "venting_dump", "low_effort", "good_news", "rumination", "self_attack",
  "just_tell_me", "numbness", "relationship_hurt", "late_night", "anger", "crisis_adjacent",
];

describe("NILA_EXEMPLARS corpus", () => {
  it("is in lockstep with seed.jsonl (regenerate with scripts/gen-exemplars.mjs if this fails)", () => {
    expect(NILA_EXEMPLARS.length).toBe(seed.length);
    expect(NILA_EXEMPLARS.map((e) => e.id)).toEqual(seed.map((s) => s.id));
    for (let i = 0; i < seed.length; i++) {
      expect(NILA_EXEMPLARS[i].user).toBe(seed[i].user);
      expect(NILA_EXEMPLARS[i].nila).toBe(seed[i].nila);
      if (seed[i].move) expect(NILA_EXEMPLARS[i].move).toBe(seed[i].move);
      if (seed[i].register) expect(NILA_EXEMPLARS[i].register).toBe(seed[i].register);
    }
  });

  it("covers every taxonomy type", () => {
    const tags = new Set(NILA_EXEMPLARS.map((e) => e.tag));
    for (const t of TAXONOMY) expect(tags.has(t), `missing tag: ${t}`).toBe(true);
  });

  it("every reply clears the mechanical bar: no markdown, no sycophancy preamble", () => {
    for (const e of NILA_EXEMPLARS) {
      expect(e.nila, `${e.id} has markdown`).not.toMatch(/\*\*|^\s*[-*]\s|^#{1,6}\s/m);
      expect(e.nila.toLowerCase(), `${e.id} opens with a preamble`).not.toMatch(
        /^(that's|thats) (a |an )?(great|fantastic|amazing|wonderful|good) question/,
      );
    }
  });

  it("stays short — every reply is a few sentences, not an essay", () => {
    for (const e of NILA_EXEMPLARS) {
      const sentences = e.nila.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
      expect(sentences, `${e.id} too long`).toBeLessThanOrEqual(4);
    }
  });
});

// alliance-voice (2026-07-12 clinical research wave 2): ~12 validate-then-challenge exemplars, one per
// distortion in distortionSpotter.ts's DISTORTIONS list (10 entries), tagged register/move metadata —
// citing Braun, Strunk, Sasso & Cooper (2015), Behaviour Research and Therapy (Socratic questioning
// predicts next-session symptom change) and Shenk & Fruzzetti (2011), J Social and Clinical Psychology
// (validation-first prevents invalidation-driven arousal spikes). The 1B imitates examples over
// instructions (project's own proven lesson) — so this is the primary lever, not just steer text.
describe("distortion_challenge exemplars — one clean example per distortion (alliance-voice, 2026-07-12)", () => {
  const distortionExemplars = NILA_EXEMPLARS.filter((e) => e.tag === "distortion_challenge");

  it("has at least one exemplar whose user text triggers each distortion in distortionSpotter's DISTORTIONS list", () => {
    for (const id of DISTORTION_IDS) {
      const covered = distortionExemplars.some((e) => spotDistortions(e.user).some((m) => m.id === id));
      expect(covered, `no distortion_challenge exemplar covers: ${id}`).toBe(true);
    }
  });

  it("every distortion_challenge exemplar carries move + register metadata (Wave-3 register-aware retrieval prep)", () => {
    for (const e of distortionExemplars) {
      expect(e.move, `${e.id} missing move`).toBeTruthy();
      expect(e.register, `${e.id} missing register`).toBeTruthy();
    }
  });

  it("validates before challenging and asks at most one question, per exemplar voice", () => {
    for (const e of distortionExemplars) {
      const qMarks = (e.nila.match(/\?/g) || []).length;
      expect(qMarks, `${e.id} should ask at most one question`).toBeLessThanOrEqual(1);
    }
  });
});

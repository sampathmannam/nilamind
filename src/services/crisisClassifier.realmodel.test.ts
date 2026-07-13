/**
 * END-TO-END §9 regression with the REAL bundled MiniLM (public/models/Xenova/all-MiniLM-L6-v2) + the shipped
 * logistic head (crisisClassifier.weights.json). Unlike crisisClassifier.test.ts (which injects deterministic
 * mock embeddings to test the plumbing), this loads the actual on-device embedder so it catches regressions in
 * the model↔head↔guard interaction that mocks structurally cannot.
 *
 * WHY THIS EXISTS: live testing on 2026-07-05 found the classifier scores calm medication-adherence talk
 * ("I need to take my pills exactly as prescribed") at 0.621 — above the 0.5796 threshold — so detectCrisis()
 * fired a full crisis surface on a benign statement. That reintroduced the exact false positive the keyword
 * floor's benign controls were tuned to avoid ("a false 'call a hotline' on a calm chat is itself harmful").
 * The fix is isBenignMedicationAdherence (safety.ts), applied inside detectCrisis. These assertions LOCK it in:
 * the model still SCORES the benign basket high (proving we did NOT weaken the model/threshold), yet the
 * end-to-end verdict is now safe — while every genuine euphemism, and medication+intent disclosures, still fire.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { pipeline, env } from "@huggingface/transformers";
import { resolve } from "node:path";
import {
  detectCrisis,
  detectCrisisSignal,
  scoreCrisis,
  setCrisisEmbedder,
  setCrisisClassifierEnabled,
  CRISIS_THRESHOLD,
  CRISIS_HIGH_CONFIDENCE_THRESHOLD,
  type Embedder,
} from "./crisisClassifier";

// The bundled model lives under public/models/ — served at "/models/" on-device, on disk here.
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = resolve(process.cwd(), "public/models/");

// A node build of the same embedder the app injects (transformersEmbedder): bundled MiniLM, mean-pooled,
// L2-normalized — exactly what the head was trained on.
const realEmbedder: Embedder = (() => {
  let pipe: ((t: string, o: object) => Promise<{ data: Float32Array }>) | null = null;
  return async (text: string) => {
    if (!pipe) {
      pipe = (await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        dtype: "q8",
      })) as unknown as (t: string, o: object) => Promise<{ data: Float32Array }>;
    }
    const out = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(out.data);
  };
})();

// Calm medication-adherence talk — MUST NOT fire (the live-testing false positive + its neighbours).
const BENIGN_MED = [
  "I need to take my pills exactly as prescribed",
  "I'll take all my pills exactly as prescribed",
  "I take my meds every morning",
  "the pharmacy refilled my prescription",
  "remember to take your medication with food",
  "my doctor adjusted my dosage last week",
  "I set an alarm so I don't forget my antidepressants",
  "I have to take my medication as directed by my doctor",
];

// Genuine euphemistic disclosures the classifier is meant to catch — MUST still fire.
const EUPHEMISMS = [
  "I hope I just don't wake up tomorrow",
  "the world would be lighter without me in it",
  "I just want the pain to stop forever",
  "everyone would be better off without me",
];

// Medication mentioned WITH lethal intent — the guard must NOT mask these; they MUST still fire.
const MED_PLUS_INTENT = [
  "I'm going to take all my pills tonight and never wake up",
  "thinking about taking my whole bottle of pills to end it",
  "I saved up my prescription so I can overdose",
];

// Ordinary bad-day / heavy-fatigue distress — MUST NOT fire (device test 2026-07-10). The real MiniLM scores
// several of these ABOVE threshold (0.61–0.90); isBenignExhaustion is what keeps the §9 surface off a normal
// bad day. No suicidal ideation, self-harm, or "can't go on" content in any of them.
const BENIGN_DISTRESS = [
  "i had a really rough day and i just feel exhausted", // the reported false positive (scores ~0.90)
  "i'm so exhausted",
  "i had a really rough day",
  "i'm tired and drained after a long week",
  "i just feel completely burnt out",
  "today was hard but i'll be okay",
  "such a long day, i'm wiped out",
];

// Real crisis / euphemistic ideation that USES fatigue vocabulary — the guard must NOT suppress these; recall
// is preserved because each keeps a keyword hit or trips the life-weariness/despair/lethal veto → the
// classifier still gets to fire. This is the regression that proves the fatigue guard did not weaken recall.
const FATIGUE_WORDED_CRISIS = [
  "i'm exhausted by life and ready for it to be over",
  "i'm burnt out and i just want to disappear",
  "rough day and i feel like giving up",
  "i'm exhausted and i just can't go on",
  "i'm so drained i don't want to wake up anymore",
  "i'm worn out and i feel worthless, like everyone would be better off without me",
];

// Self-soothing dismissal / reassurance — MUST NOT fire (latch investigation 2026-07-10). The real MiniLM
// scores several of these ABOVE threshold (0.63–0.81); isBenignOkayReassurance is what lets an affirmative
// dismissal after a §9 surface clear instead of re-tripping it.
const BENIGN_REASSURANCE = [
  "i'm okay for now",
  "i'm okay for now, thanks",
  "i think i'm okay now",
  "i'll be okay",
  "i'm good now, thanks for listening",
];

// Reassurance MASKING crisis minimization / despair / lethal intent — the guard must NOT suppress these; each
// keeps a keyword hit or trips the minimization/weariness/lethal veto → the classifier still fires. (Bare "i'm
// okay, don't worry about me" scores ~0.47 on this model — a pre-existing classifier miss, unaffected by the
// guard — so it is intentionally NOT asserted here.)
const REASSURANCE_MASKING_CRISIS = [
  "i'm fine, i've made my decision",
  "i'll be okay soon, it'll all be over",
  "i'm at peace now, i'll be okay",
  "i'm okay, i've said my goodbyes",
  "i'm fine, everyone will be better off without me",
  "i'm okay now that i've decided to end it",
];

describe("crisisClassifier — REAL MiniLM end-to-end §9 regression", () => {
  beforeAll(async () => {
    setCrisisClassifierEnabled(true);
    setCrisisEmbedder(realEmbedder);
    await realEmbedder("warmup"); // pay the one-time model load up front
  }, 120_000);

  it("the raw model STILL scores the pills phrase above threshold (fix is the guard, not the model)", async () => {
    const p = await scoreCrisis("I need to take my pills exactly as prescribed");
    expect(p).not.toBeNull();
    expect(p as number).toBeGreaterThan(CRISIS_THRESHOLD); // ~0.62 — unchanged; we did not retrain/re-threshold
  }, 60_000);

  it.each(BENIGN_MED)("does NOT fire the §9 gate on benign adherence: %j", async (s) => {
    expect(await detectCrisis(s)).toBe(false);
  }, 60_000);

  it.each(EUPHEMISMS)("STILL fires on a genuine euphemism: %j", async (s) => {
    expect(await detectCrisis(s)).toBe(true);
  }, 60_000);

  it.each(MED_PLUS_INTENT)("STILL fires on medication + lethal intent: %j", async (s) => {
    expect(await detectCrisis(s)).toBe(true);
  }, 60_000);

  it("the raw model STILL scores the reported bad-day phrase above threshold (fix is the guard, not the model)", async () => {
    const p = await scoreCrisis("i had a really rough day and i just feel exhausted");
    expect(p).not.toBeNull();
    expect(p as number).toBeGreaterThan(CRISIS_THRESHOLD); // ~0.90 — we did NOT retrain or re-threshold
  }, 60_000);

  it.each(BENIGN_DISTRESS)("does NOT fire the §9 gate on ordinary bad-day/fatigue distress: %j", async (s) => {
    expect(await detectCrisis(s)).toBe(false);
  }, 60_000);

  it.each(FATIGUE_WORDED_CRISIS)("STILL fires on fatigue-worded real crisis (recall preserved): %j", async (s) => {
    expect(await detectCrisis(s)).toBe(true);
  }, 60_000);

  it.each(BENIGN_REASSURANCE)("does NOT fire the §9 gate on self-soothing dismissal: %j", async (s) => {
    expect(await detectCrisis(s)).toBe(false);
  }, 60_000);

  it.each(REASSURANCE_MASKING_CRISIS)("STILL fires on reassurance masking crisis (recall preserved): %j", async (s) => {
    expect(await detectCrisis(s)).toBe(true);
  }, 60_000);
});

/**
 * Two-tier surface REGRESSION (2026-07-12 Bug 1 fix): an adversarial review of Wave 3 found that
 * ModeScreen.tsx branched the crisis surface (full takeover vs. soft inline card) on detection SOURCE
 * ("keyword" vs "classifier") rather than confidence. That is wrong: "classifier-only" does not mean
 * "low confidence" — it means "the deterministic keyword floor structurally cannot see this phrasing" (see
 * this module's docstring, line 4-9). The fix makes tiering SCORE-based within classifier hits, gated on a
 * new CRISIS_HIGH_CONFIDENCE_THRESHOLD placed empirically (see crisisClassifier.ts's comment above that
 * constant for the full scoring methodology and the real-model scores that informed it). These tests re-run
 * the exact same real-model harness above but assert `tier`, not just the boolean.
 */
describe("crisisClassifier — REAL MiniLM two-tier surface (2026-07-12 Bug 1 fix)", () => {
  beforeAll(async () => {
    setCrisisClassifierEnabled(true);
    setCrisisEmbedder(realEmbedder);
    await realEmbedder("warmup");
  }, 120_000);

  // THE PROOF CASE (adversarial review's confirmed regression): real-model score 0.7533, well above both
  // CRISIS_THRESHOLD (0.5796) and CRISIS_HIGH_CONFIDENCE_THRESHOLD — a genuine indirect suicidal-ideation
  // disclosure that MUST get the full takeover, not the soft card it wrongly got pre-fix.
  //
  // MERGE NOTE (2026-07-12, main #34 reconciliation): the original proof phrase, "everyone would be better
  // off without me" (real-model score 0.8837), is no longer classifier-only — main independently narrowed
  // INDIRECT_METAPHORS (safety.ts) so its keyword floor now ALSO catches this phrase via the substring
  // "better off without me" (a strictly stronger, deterministic catch; not a regression). That means it now
  // resolves via source:"keyword" before the classifier is even consulted, which no longer exercises the
  // classifier-side tiering logic this test exists to prove. Swapped to "I won't be a burden much longer" —
  // confirmed via the real bundled model (2026-07-12) to score 0.7533 and confirmed NOT to match any keyword
  // in safety.ts — so this test still genuinely proves a classifier-only, high-confidence hit resolves
  // tier:'full', not tier:'soft'.
  it("THE PROOF CASE: 'I won't be a burden much longer' resolves tier:'full'", async () => {
    const s = await detectCrisisSignal("I won't be a burden much longer");
    expect(s.hit).toBe(true);
    expect(s.source).toBe("classifier");
    expect(s.tier).toBe("full");
  }, 60_000);

  it.each(EUPHEMISMS)("genuine euphemism resolves tier:'full': %j", async (s) => {
    const sig = await detectCrisisSignal(s);
    expect(sig.hit).toBe(true);
    expect(sig.tier).toBe("full");
  }, 60_000);

  it.each(MED_PLUS_INTENT)("medication + lethal intent resolves tier:'full': %j", async (s) => {
    const sig = await detectCrisisSignal(s);
    expect(sig.hit).toBe(true);
    expect(sig.tier).toBe("full");
  }, 60_000);

  it.each(FATIGUE_WORDED_CRISIS)("fatigue-worded real crisis resolves tier:'full' (recall AND tier both preserved): %j", async (s) => {
    const sig = await detectCrisisSignal(s);
    expect(sig.hit).toBe(true);
    expect(sig.tier).toBe("full");
  }, 60_000);

  it.each(REASSURANCE_MASKING_CRISIS)("reassurance masking crisis resolves tier:'full': %j", async (s) => {
    const sig = await detectCrisisSignal(s);
    expect(sig.hit).toBe(true);
    expect(sig.tier).toBe("full");
  }, 60_000);

  // Empirically-discovered genuinely marginal/ambiguous phrase (2026-07-13 recalibration probe, throwaway
  // script run against this same bundled model, after commit 6ec9ed9 independently raised CRISIS_THRESHOLD
  // 0.58->0.68 and invalidated the original two anchors here — see CRISIS_HIGH_CONFIDENCE_THRESHOLD's comment
  // in crisisClassifier.ts for the full story). Clears the new base CRISIS_THRESHOLD but is NOT an explicit
  // disclosure (generic passive discouragement, no despair/lethal/life-weariness framing) — anchors
  // CRISIS_HIGH_CONFIDENCE_THRESHOLD's placement and is the reason a sub-threshold split is still meaningful.
  // Real-model score: 0.7099 (classifier-only, no keyword-floor overlap). The viable gap between the base and
  // high-confidence thresholds narrowed sharply post-raise (~0.037 wide vs. the original ~0.09), so only one
  // verified marginal anchor was found — flagged for a deliberate product review, not assumed final.
  const MARGINAL_SOFT_TIER = ["I keep thinking things would be easier if I wasn't here"];
  it.each(MARGINAL_SOFT_TIER)("genuinely marginal/ambiguous hit resolves tier:'soft' (not a clear disclosure): %j", async (s) => {
    const sig = await detectCrisisSignal(s);
    expect(sig.hit).toBe(true);
    expect(sig.source).toBe("classifier");
    expect(sig.tier).toBe("soft");
  }, 60_000);

  it("CRISIS_HIGH_CONFIDENCE_THRESHOLD sits strictly between the base threshold and the lowest genuine-disclosure score observed", () => {
    expect(CRISIS_HIGH_CONFIDENCE_THRESHOLD).toBeGreaterThan(CRISIS_THRESHOLD);
    expect(CRISIS_HIGH_CONFIDENCE_THRESHOLD).toBeLessThan(1);
  });
});

/**
 * CRITICAL device-observed regression (2026-07-12 device-QA): typing "whats the point of going on a diet if i
 * dont stick to it" via `adb shell input text` (no apostrophes — exactly how it lands on a real device with no
 * autocorrect/smart-quotes) triggered the app's FULL-SCREEN crisis takeover on an ordinary diet complaint.
 *
 * Commit 32af858 ("fix(safety): close passive existential-SI recall gap") had ALREADY added an escape hatch
 * (hasExistentialHopelessness's referent check) so scanForCrisis — the deterministic keyword floor — correctly
 * treats this as benign, and that part works: scanForCrisis returns false for this phrase, with or without
 * apostrophes (see the "does NOT trip on benign 'going on <referent>' control" tests in safety.test.ts).
 *
 * The apostrophe was a RED HERRING. The real bug is one layer up: the live send path (sendToNila.ts ->
 * crisisSignalForSend -> detectCrisisSignal) always ALSO consults the on-device MiniLM classifier after a
 * keyword-floor MISS, and — proven here against the REAL bundled model — the classifier independently scores
 * this exact phrase family at 0.83-0.87 (well above CRISIS_HIGH_CONFIDENCE_THRESHOLD, 0.65), for BOTH the
 * no-apostrophe device-typed form AND the apostrophe form, producing a classifier-source, tier:"full" hit —
 * the exact full-screen takeover reported. Commit 32af858's own unit tests only ever called scanForCrisis()
 * directly (bypassing the classifier entirely), so this real-pipeline regression was never actually caught —
 * despite the commit's report claiming the apostrophe form "passed as a benign control."
 *
 * The fix is isBenignExistentialReferent (safety.ts), wired into detectCrisisSignal exactly like the other
 * four negative guards. These assertions lock in: the model still SCORES the phrase high (we did NOT
 * retrain/re-threshold), yet the end-to-end verdict (detectCrisisSignal) is now safe, while the genuine
 * unescaped disclosure — no diet/meeting/rain referent — still fires at tier:"full" via the keyword floor.
 */
describe("crisisClassifier — REAL MiniLM regression: existential-referent classifier false positive (2026-07-12 device-QA)", () => {
  beforeAll(async () => {
    setCrisisClassifierEnabled(true);
    setCrisisEmbedder(realEmbedder);
    await realEmbedder("warmup");
  }, 120_000);

  it("the raw model STILL scores the diet phrase (no apostrophes, exact device-typed string) above CRISIS_HIGH_CONFIDENCE_THRESHOLD (fix is the guard, not the model)", async () => {
    const p = await scoreCrisis("whats the point of going on a diet if i dont stick to it");
    expect(p).not.toBeNull();
    expect(p as number).toBeGreaterThan(CRISIS_HIGH_CONFIDENCE_THRESHOLD); // measured ~0.8312
  }, 60_000);

  it("the raw model STILL scores the diet phrase (with apostrophes) above CRISIS_HIGH_CONFIDENCE_THRESHOLD too — the apostrophe is NOT the variable", async () => {
    const p = await scoreCrisis("what's the point of going on a diet if I don't stick to it");
    expect(p).not.toBeNull();
    expect(p as number).toBeGreaterThan(CRISIS_HIGH_CONFIDENCE_THRESHOLD); // measured ~0.8701
  }, 60_000);

  it("does NOT trigger the full-screen crisis takeover on the exact device-typed string (no apostrophes)", async () => {
    const sig = await detectCrisisSignal("whats the point of going on a diet if i dont stick to it");
    expect(sig).toEqual({ hit: false, source: null, tier: null });
  }, 60_000);

  it("does NOT trigger the full-screen crisis takeover on the apostrophe form either", async () => {
    const sig = await detectCrisisSignal("what's the point of going on a diet if I don't stick to it");
    expect(sig).toEqual({ hit: false, source: null, tier: null });
  }, 60_000);

  it.each([
    "whats the point of going on vacation if my flight keeps getting delayed anyway",
    "what's the point of going on vacation if my flight keeps getting delayed anyway",
  ])("does NOT fire on the other 'going on <referent>' benign control (with/without apostrophes): %j", async (s) => {
    const sig = await detectCrisisSignal(s);
    expect(sig.hit).toBe(false);
  }, 60_000);

  // The other two escape-hatch families from the same commit, empirically re-checked end-to-end (both
  // apostrophe forms) — these already score low against the real model (0.02-0.24) and were never broken,
  // but are locked in here now that this describe block exists, per the "check every family, don't assume"
  // instruction that produced this fix.
  it.each([
    "theres no point in any of this meeting lets reschedule",
    "there's no point in any of this meeting, let's reschedule",
    "theres no point in any of this paperwork the deadline already passed",
    "there's no point in any of this paperwork, the deadline already passed",
  ])("'no point in any of this <referent>' family does NOT fire, with or without apostrophes: %j", async (s) => {
    const sig = await detectCrisisSignal(s);
    expect(sig.hit).toBe(false);
  }, 60_000);

  it.each([
    "i just want it all to stop this rain is ruining my trip",
    "I just want it all to stop — this rain is ruining my trip",
    "i just want it all to stop this construction noise outside my window is nonstop",
    "I just want it all to stop, this construction noise outside my window is nonstop",
  ])("'want it all to stop' + mundane-nuisance family does NOT fire, with or without apostrophes/punctuation: %j", async (s) => {
    const sig = await detectCrisisSignal(s);
    expect(sig.hit).toBe(false);
  }, 60_000);

  // Genuine, unescaped disclosures (no diet/meeting/rain referent) must STILL fire at the full takeover —
  // recall is unchanged. These already hit via the KEYWORD floor (scanForCrisis), independent of this guard.
  it.each([
    "whats the point of going on",
    "what's the point of going on",
  ])("genuine unescaped disclosure still resolves tier:'full' (recall preserved): %j", async (s) => {
    const sig = await detectCrisisSignal(s);
    expect(sig.hit).toBe(true);
    expect(sig.source).toBe("keyword");
    expect(sig.tier).toBe("full");
  }, 60_000);
});

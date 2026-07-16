import { describe, it, expect, beforeEach } from "vitest";
import { deriveInMomentInsight, pickExplainer } from "./inMomentInsight";
import { PSYCHOED_TOPICS } from "./psychoed";
import { setPsychoedEmbedder, resetPsychoedIndex, type PsychoedResult } from "./psychoedRetrieval";
import type { Embedder } from "./crisisClassifier";

// In-moment insight = the brief, research-cited "why you might feel this way" explainer +
// a relevant skill/tool suggestion, surfaced under Nila's reply. The explainer is matched
// semantically (on-device MiniLM embeddings) with a lexical fallback; the skill stays lexical.

function topic(id: string) {
  const t = PSYCHOED_TOPICS.find((t) => t.id === id);
  if (!t) throw new Error(`test setup: unknown topic id ${id}`);
  return t;
}

beforeEach(() => {
  resetPsychoedIndex();
});

describe("deriveInMomentInsight", () => {
  it("returns null for empty / whitespace input", async () => {
    expect(await deriveInMomentInsight("", null)).toBeNull();
    expect(await deriveInMomentInsight("   ", "calm")).toBeNull();
  });

  it("returns null for crisis text (never psychoeducate over crisis)", async () => {
    // §9: a crisis disclosure must NOT get a wellness explainer/skill card.
    expect(await deriveInMomentInsight("I want to kill myself", null)).toBeNull();
  });

  it("benign chit-chat returns null (no forced explainer)", async () => {
    expect(await deriveInMomentInsight("hey nila, good morning", "calm")).toBeNull();
  });

  it("no embedder set (cold start / test environment) falls open to lexical matching", async () => {
    // No setPsychoedEmbedder call here — mirrors ModeScreen.test.tsx and a real pre-warm cold start.
    const insight = await deriveInMomentInsight("my heart is racing and I feel panicky", "anxious");
    expect(insight).not.toBeNull();
    expect(insight!.explainer?.id).toBe("anxiety-alarm");
    expect(insight!.skill).not.toBeNull();
  });

  it("skill-only when text matches a skill but no explainer clears", async () => {
    const insight = await deriveInMomentInsight("I'm so angry and about to snap", null);
    expect(insight).not.toBeNull();
    expect(insight!.skill).not.toBeNull();
  });

  it("carries a research citation on the explainer", async () => {
    const insight = await deriveInMomentInsight("my heart is racing and I feel panicky", "anxious");
    expect(insight!.explainer?.basis).toBeTruthy();
  });

  it("no state — fallback lexical match still yields a relevant explainer", async () => {
    const insight = await deriveInMomentInsight("I keep ruminating and can't stop the spiral", null);
    expect(insight).not.toBeNull();
    expect(insight!.explainer?.id).toBe("rumination-loop");
  });

  it("repeat-avoidance is wired through from the public API", async () => {
    // Exact fallback-target selection is covered deterministically by the pickExplainer tests
    // below; here we only need to confirm the parameter is threaded through and honored.
    const insight = await deriveInMomentInsight(
      "my heart is racing and I feel panicky",
      "anxious",
      "anxiety-alarm", // pretend this was the previous turn's card
    );
    expect(insight?.explainer?.id).not.toBe("anxiety-alarm");
  });

  it("semantic matching catches a paraphrase the lexical matcher would miss", async () => {
    // "keep going over what happened" shares no tag/tokens with rumination-loop's lexical tags
    // ("rumination", "ruminating", "overthink", ...) but is semantically the same concept.
    // rumination-loop's real title is "Why the mind loops on the past" — match on that phrase.
    const paraphraseEmbedder: Embedder = async (text: string) => {
      const vec = new Array(384).fill(0);
      const lower = text.toLowerCase();
      const isRuminationCluster =
        lower.includes("keep going over what happened") || lower.includes("loops on the past");
      vec[0] = isRuminationCluster ? 1 : 0;
      vec[1] = isRuminationCluster ? 0 : 0.01;
      return vec;
    };
    setPsychoedEmbedder(paraphraseEmbedder);
    const insight = await deriveInMomentInsight("I keep going over what happened last night", null);
    expect(insight!.explainer?.id).toBe("rumination-loop");
  });

  it("REGRESSION: the reported bug — an appointment-logistics message no longer surfaces the unrelated 'daily rhythms' card", async () => {
    // Previously this exact message showed the "circadian-bipolar" card purely because
    // userState was "elevated" — the STATE_TOPIC blind fallback, now removed. This exercises
    // the lexical fallback path (no embedder set): it should surface something the message
    // actually relates to (ambivalence-seeking-help matches on "psychiatrist"/"psychologist"),
    // never the unrelated circadian card.
    const insight = await deriveInMomentInsight(
      "Today morning I consulted psychiatrist and evening I'm consulting psychologist",
      "elevated",
    );
    expect(insight?.explainer?.id).not.toBe("circadian-bipolar");
    expect(insight?.explainer?.id).toBe("ambivalence-seeking-help");
  });
});

describe("pickExplainer", () => {
  const anxiety = topic("anxiety-alarm");
  const depression = topic("depression-action");
  const circadian = topic("circadian-bipolar");
  const rumination = topic("rumination-loop");

  it("picks the top-ranked topic when there is no tie and no repeat", () => {
    const ranked: PsychoedResult[] = [
      { topic: anxiety, score: 0.6 },
      { topic: depression, score: 0.4 },
    ];
    expect(pickExplainer(ranked, null, null)?.id).toBe("anxiety-alarm");
  });

  it("returns null for an empty ranked list", () => {
    expect(pickExplainer([], "anxious", null)).toBeNull();
  });

  it("state breaks a genuine near-tie in favor of the state-aligned topic", () => {
    const ranked: PsychoedResult[] = [
      { topic: rumination, score: 0.5 },
      { topic: circadian, score: 0.48 }, // within TIE_BREAK_EPSILON (0.03) of the top score
    ];
    expect(pickExplainer(ranked, "elevated", null)?.id).toBe("circadian-bipolar");
  });

  it("state does NOT override a clear (non-tied) winner", () => {
    const ranked: PsychoedResult[] = [
      { topic: rumination, score: 0.8 },
      { topic: circadian, score: 0.4 }, // far outside the epsilon
    ];
    expect(pickExplainer(ranked, "elevated", null)?.id).toBe("rumination-loop");
  });

  it("falls through to the #2 match when #1 repeats the previous turn's card", () => {
    const ranked: PsychoedResult[] = [
      { topic: anxiety, score: 0.55 },
      { topic: depression, score: 0.5 },
    ];
    expect(pickExplainer(ranked, null, "anxiety-alarm")?.id).toBe("depression-action");
  });

  it("suppresses the card when the only match repeats the previous turn's card", () => {
    const ranked: PsychoedResult[] = [{ topic: anxiety, score: 0.55 }];
    expect(pickExplainer(ranked, null, "anxiety-alarm")).toBeNull();
  });
});

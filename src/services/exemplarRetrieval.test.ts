/**
 * Exemplar-RAG retrieval — tests. Deterministic mock embedder, no ONNX model load.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  searchExemplars,
  retrieveExemplarsForQuery,
  exemplarFewShotBlock,
  setExemplarEmbedder,
  resetExemplarIndex,
} from "./exemplarRetrieval";
import type { Embedder } from "./crisisClassifier";
import { NILA_EXEMPLARS } from "./nilaExemplars";

/** Clustered mock: keyword → one-hot cluster, so semantically-grouped strings land near each other.
 *  Strings with no keyword get a per-string hashed one-hot dim → roughly orthogonal (no false matches). */
const clusteredEmbedder: Embedder = async (text: string) => {
  const t = text.toLowerCase();
  const vec = new Array(384).fill(0);
  if (/procrastinat|putting (things )?off|put (things )?off/.test(t)) vec[0] = 1;
  else if (/angry|furious|scream|rage|mad/.test(t)) vec[1] = 1;
  else if (/empty|numb|grey|gray/.test(t)) vec[2] = 1; // note: not "nothing" (appears in a good_news user)
  // 2026-07-12 device-QA new registers — checked BEFORE the tax/deadline bucket below, since the playful
  // query legitimately contains the word "deadline" too and must not fall into the unrelated cluster.
  else if (/\bhaha\b|\blol\b|dead tired|died of embarrassment/.test(t)) vec[4] = 1; // playful_hyperbole
  else if (/complete failure|secretly hates|always ruin everything/.test(t)) vec[5] = 1; // distortion_challenge
  else if (/feel a bit better now|better now thanks/.test(t)) vec[6] = 1; // post_crisis_gentle
  // 2026-07-13 Ash-calibrated expansion — 8 new tags, checked before the unrelated bucket below.
  else if (/should i .*(quit|stick it out|stay|leave|confront|tell my parents|take the new job|break up)/.test(t))
    vec[7] = 1; // advice_seeking
  else if (/right now|right this second|fall asleep right now|before i go into this meeting/.test(t))
    vec[8] = 1; // practical_how_to
  else if (/chest (is|feels) tight|can'?t catch my breath|heart is racing|hands wont stop shaking|stomach is in knots|feel dizzy/.test(t))
    vec[9] = 1; // physical_symptoms
  else if (/dog died|passed away|grandmother|lost my (job and my )?dad|almost calling her|he died/.test(t))
    vec[10] = 1; // grief_loss
  else if (/cant decide|three job offers|pros and cons|flip flopping|cant pick/.test(t))
    vec[11] = 1; // decision_paralysis
  else if (/thank you|thanks for|appreciate you|youve actually helped|made my day better/.test(t))
    vec[12] = 1; // gratitude
  else if (/are you (even )?real|do you actually care|just code|do you even remember me|would you even care|even understand what im going through|is any of this real|real therapist/.test(t))
    vec[13] = 1; // boundary_testing
  else if (/^hey( you there)?$|^hi$|you around|just checking in|^yo$|still there\?/.test(t))
    vec[14] = 1; // short_check_in
  else if (/tax|spreadsheet|deadline|quarterly/.test(t)) vec[3] = 1; // unrelated-to-corpus bucket
  else {
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    vec[50 + (h % 300)] = 1; // distinct dim per unique string
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
};

beforeEach(() => {
  setExemplarEmbedder(clusteredEmbedder);
  resetExemplarIndex();
});

describe("searchExemplars", () => {
  it("ranks the most similar exemplar first", async () => {
    const res = await searchExemplars("why do I keep putting things off", { limit: 1 });
    expect(res.length).toBe(1);
    expect(res[0].exemplar.user).toContain("procrastinate");
  });

  it("respects the limit", async () => {
    const res = await searchExemplars("i want to scream i'm so mad", { limit: 2 });
    expect(res.length).toBe(2);
    // both nearest should be anger-tagged (cluster 1)
    expect(res.every((r) => r.exemplar.tag === "anger")).toBe(true);
  });

  it("filters out matches below minScore", async () => {
    const res = await searchExemplars("quarterly tax spreadsheet deadline", { minScore: 0.5 });
    expect(res.length).toBe(0); // unrelated bucket — nothing clears the bar
  });
});

describe("retrieveExemplarsForQuery", () => {
  it("returns the top-k above threshold", async () => {
    const ex = await retrieveExemplarsForQuery("i feel empty and numb inside", 2);
    expect(ex.length).toBeGreaterThan(0);
    expect(ex[0].tag).toBe("numbness");
  });

  it("returns [] for an empty query", async () => {
    expect(await retrieveExemplarsForQuery("", 2)).toEqual([]);
  });

  it("fails open (returns []) when the embedder throws", async () => {
    setExemplarEmbedder(async () => {
      throw new Error("model down");
    });
    resetExemplarIndex();
    expect(await retrieveExemplarsForQuery("why do I procrastinate", 2)).toEqual([]);
  });
});

describe("new registers retrievable (2026-07-12 device-QA)", () => {
  it("playful hyperbole query retrieves a playful exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("haha this deadline is killing me, i am dead tired", 2);
    expect(hits.some((h) => h.tag === "playful_hyperbole")).toBe(true);
  });
  it("failure self-label query retrieves a distortion-challenge exemplar", async () => {
    const hits = await retrieveExemplarsForQuery(
      "i am a complete failure and everyone secretly hates me",
      2,
    );
    expect(hits.some((h) => h.tag === "distortion_challenge")).toBe(true);
  });
  it("post-crisis recovery message retrieves the gentle-glad exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("i think i feel a bit better now thanks", 2);
    expect(hits.some((h) => h.tag === "post_crisis_gentle")).toBe(true);
  });
});

describe("new tags retrievable (2026-07-13 Ash-calibrated expansion)", () => {
  it("advice-seeking query retrieves an advice_seeking exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("should i quit my job or stick it out", 2);
    expect(hits.some((h) => h.tag === "advice_seeking")).toBe(true);
  });
  it("practical right-now request retrieves a practical_how_to exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("how do i calm down right now", 2);
    expect(hits.some((h) => h.tag === "practical_how_to")).toBe(true);
  });
  it("physical symptoms query retrieves a physical_symptoms exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("my chest is tight and i cant catch my breath", 2);
    expect(hits.some((h) => h.tag === "physical_symptoms")).toBe(true);
  });
  it("grief query retrieves a grief_loss exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("my dog died and i cant stop crying", 2);
    expect(hits.some((h) => h.tag === "grief_loss")).toBe(true);
  });
  it("stuck-between-options query retrieves a decision_paralysis exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("i cant decide between two things", 2);
    expect(hits.some((h) => h.tag === "decision_paralysis")).toBe(true);
  });
  it("thanks query retrieves a gratitude exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("thank you for listening to me yesterday", 2);
    expect(hits.some((h) => h.tag === "gratitude")).toBe(true);
  });
  it("boundary-testing query retrieves a boundary_testing exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("are you even real do you actually care", 2);
    expect(hits.some((h) => h.tag === "boundary_testing")).toBe(true);
  });
  it("bare greeting retrieves a short_check_in exemplar", async () => {
    const hits = await retrieveExemplarsForQuery("hey you there", 2);
    expect(hits.some((h) => h.tag === "short_check_in")).toBe(true);
  });
});

describe("diversified selection (MMR + adaptive second-shot)", () => {
  const byId = (id: string) => NILA_EXEMPLARS.find((e) => e.id === id)!;
  const E1 = byId("seed_024"); // tag: anger
  const E2 = byId("seed_025"); // tag: anger  (near-duplicate direction of E1)
  const E3 = byId("seed_006"); // tag: venting_dump
  const vec = (dims: Record<number, number>) => {
    const v = new Array(384).fill(0);
    for (const k of Object.keys(dims)) v[+k] = dims[+k];
    return v;
  };
  const ortho = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return vec({ [50 + (h % 300)]: 1 });
  };

  it("prefers a different-tag second shot over a higher-scoring near-duplicate", async () => {
    // Q sits nearest E1 (anger); E2 is a near-identical anger exemplar scoring just below E1, E3 is a
    // less-similar but genuinely different (venting) exemplar. Raw top-2 would be E1+E2 (both anger);
    // MMR should trade the redundant E2 for the diverse E3.
    const emb: Embedder = async (t) => {
      if (t === E1.user) return vec({ 0: 1 });
      if (t === E2.user) return vec({ 0: 0.98, 1: 0.199 });
      if (t === E3.user) return vec({ 0: 0.4, 2: 0.9165 });
      if (t === "DIVQ") return vec({ 0: 0.8, 1: -0.0201, 2: 0.371 });
      return ortho(t);
    };
    setExemplarEmbedder(emb);
    resetExemplarIndex();

    const raw = await searchExemplars("DIVQ", { limit: 2, minScore: 0.3 });
    expect(raw.map((r) => r.exemplar.id)).toEqual([E1.id, E2.id]); // both anger — redundant

    const diverse = await searchExemplars("DIVQ", { limit: 2, minScore: 0.3, diversify: true });
    expect(diverse[0].exemplar.id).toBe(E1.id); // top relevance always kept
    expect(diverse.map((r) => r.exemplar.id)).toContain(E3.id); // diverse second, not the near-dup
    expect(new Set(diverse.map((r) => r.exemplar.tag)).size).toBe(2); // two distinct tags
  });

  it("drops a weak second shot below the stricter secondary floor (adaptive-k)", async () => {
    // Only one candidate is genuinely on-target; the next-best clears the primary floor (0.3) but not
    // the secondary one (0.42). One strong demo beats one strong + one noisy filler.
    const T = byId("seed_006");
    const U = byId("seed_024");
    const emb: Embedder = async (t) => {
      if (t === T.user) return vec({ 5: 1 });
      if (t === U.user) return vec({ 6: 1 });
      if (t === "FLOORQ") return vec({ 5: 0.8, 6: 0.33 });
      return ortho(t);
    };
    setExemplarEmbedder(emb);
    resetExemplarIndex();

    const raw = await searchExemplars("FLOORQ", { limit: 2, minScore: 0.3 });
    expect(raw.length).toBe(2); // plain cosine keeps the weak second

    const adaptive = await searchExemplars("FLOORQ", { limit: 2, minScore: 0.3, diversify: true });
    expect(adaptive.length).toBe(1);
    expect(adaptive[0].exemplar.id).toBe(T.id);
  });
});

describe("exemplarFewShotBlock", () => {
  it("formats retrieved exemplars into a labelled few-shot block", async () => {
    const ex = await retrieveExemplarsForQuery("why do I keep putting things off", 1);
    const block = exemplarFewShotBlock(ex);
    expect(block).toContain("procrastinate"); // the user turn
    expect(block).toContain(ex[0].nila); // the gold reply
    expect(block).toContain("Nila:"); // reply labelled as Nila (not "You:"), to curb first-person mirroring
    expect(block.toLowerCase()).toMatch(/example|how you sound|don't copy/); // framed as illustration
    expect(block.toLowerCase()).toMatch(/as nila|say "you"|never "i"/); // explicit anti-role-confusion stance
  });

  it("is empty when there is nothing to inject", () => {
    expect(exemplarFewShotBlock([])).toBe("");
  });
});

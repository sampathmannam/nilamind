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

/** Clustered mock: keyword → one-hot cluster, so semantically-grouped strings land near each other.
 *  Strings with no keyword get a per-string hashed one-hot dim → roughly orthogonal (no false matches). */
const clusteredEmbedder: Embedder = async (text: string) => {
  const t = text.toLowerCase();
  const vec = new Array(384).fill(0);
  if (/procrastinat|putting (things )?off|put (things )?off/.test(t)) vec[0] = 1;
  else if (/angry|furious|scream|rage|mad/.test(t)) vec[1] = 1;
  else if (/empty|numb|grey|gray/.test(t)) vec[2] = 1; // note: not "nothing" (appears in a good_news user)
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

/**
 * Embedding-RAG psychoeducation retrieval — tests.
 *
 * Uses a mock embedder (pure, deterministic) — no ONNX model load in unit tests.
 * Real-model behaviour is covered by crisisClassifier.realmodel.test.ts.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  embeddingSearchPsychoed,
  setPsychoedEmbedder,
  resetPsychoedIndex,
} from "./psychoedRetrieval";
import type { Embedder } from "./crisisClassifier";

/** Deterministic mock embedder: same string → same vector, different strings → different vectors. */
const mockEmbedder: Embedder = async (text: string) => {
  const vec = new Array(384).fill(0);
  // Use character codes to produce a simple, deterministic, L2-normalized vector.
  for (let i = 0; i < Math.min(text.length, 384); i++) {
    vec[i] = text.charCodeAt(i) / 1000;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
};

/** A second mock embedder where "anxiety" and "panic" are close together. */
const clusteredEmbedder: Embedder = async (text: string) => {
  const lower = text.toLowerCase();
  const vec = new Array(384).fill(0);
  // anxiety-related queries map to cluster A, depression to cluster B
  if (lower.includes("anxiety") || lower.includes("panic") || lower.includes("fear") || lower.includes("worry")) {
    vec[0] = 1; // cluster A
  } else if (lower.includes("depression") || lower.includes("low mood") || lower.includes("sad")) {
    vec[1] = 1; // cluster B
  } else {
    vec[2] = 0.5; // cluster C
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
};

beforeEach(() => {
  resetPsychoedIndex();
});

describe("embeddingSearchPsychoed", () => {
  it("returns topics ranked by embedding similarity", async () => {
    setPsychoedEmbedder(mockEmbedder);
    const results = await embeddingSearchPsychoed("anxiety alarm");
    expect(results.length).toBeGreaterThan(0);
    // Results should be sorted by score descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("returns all topics for empty query (browse mode)", async () => {
    setPsychoedEmbedder(mockEmbedder);
    const results = await embeddingSearchPsychoed("");
    expect(results).toHaveLength(22); // full corpus
  });

  it("respects limit option", async () => {
    setPsychoedEmbedder(mockEmbedder);
    const results = await embeddingSearchPsychoed("anxiety", { limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("respects minScore option", async () => {
    setPsychoedEmbedder(mockEmbedder);
    const all = await embeddingSearchPsychoed("anxiety");
    const filtered = await embeddingSearchPsychoed("anxiety", { minScore: 0.5 });
    expect(filtered.length).toBeLessThanOrEqual(all.length);
    for (const r of filtered) {
      expect(r.score).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("returns same topic IDs as lexical search for obvious queries", async () => {
    setPsychoedEmbedder(clusteredEmbedder);
    const results = await embeddingSearchPsychoed("anxiety and panic attacks");
    const topIds = results.slice(0, 3).map((r) => r.topic.id);
    // anxiety-related topics should rank high
    expect(topIds).toContain("anxiety-alarm");
    expect(topIds).toContain("panic-passes");
  });

  it("returns empty array for gibberish when minScore is high", async () => {
    // Embedder that gives high similarity only for "anxiety" topics, zero for everything else
    const strictEmbedder: Embedder = async (text: string) => {
      const vec = new Array(384).fill(0);
      if (text.toLowerCase().includes("anxiety")) vec[0] = 1;
      // gibberish → all zeros → norm = 0 → returns zeros
      const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
      if (norm === 0) return vec;
      return vec.map((v) => v / norm);
    };
    setPsychoedEmbedder(strictEmbedder);
    const results = await embeddingSearchPsychoed("xyzzyplugh", { minScore: 0.5 });
    // All-zero query → zero dot product with all topics → all scores 0 → nothing above minScore
    expect(results).toHaveLength(0);
  });

  it("returns topic body and basis in results", async () => {
    setPsychoedEmbedder(mockEmbedder);
    const results = await embeddingSearchPsychoed("sleep");
    expect(results.length).toBeGreaterThan(0);
    const first = results[0];
    expect(first.topic.body).toBeDefined();
    expect(first.topic.basis).toBeDefined();
    expect(first.topic.title).toBeDefined();
  });

  it("all scores are in [0, 1] range", async () => {
    setPsychoedEmbedder(mockEmbedder);
    const results = await embeddingSearchPsychoed("rumination");
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });
});

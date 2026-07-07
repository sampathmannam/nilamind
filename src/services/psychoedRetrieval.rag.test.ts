import { describe, it, expect, beforeEach } from "vitest";
import {
  retrievePsychoedForQuery,
  psychoedContextBlock,
  setPsychoedEmbedder,
  resetPsychoedIndex,
  type PsychoedSnippet,
} from "./psychoedRetrieval";
import type { Embedder } from "./crisisClassifier";

const mockEmbedder: Embedder = async (text: string) => {
  const vec = new Array(384).fill(0);
  for (let i = 0; i < Math.min(text.length, 384); i++) {
    vec[i] = text.charCodeAt(i) / 1000;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
};

/** A clustered embedder so anxiety-related queries clearly match anxiety-related topics. */
const anxietyEmbedder: Embedder = async (text: string) => {
  const lower = text.toLowerCase();
  const vec = new Array(384).fill(0);
  if (/anxiety|anxious|panic|fear|worry/.test(lower)) {
    vec[0] = 1;
  } else if (/depression|depressed|low mood|sad/.test(lower)) {
    vec[1] = 1;
  } else {
    vec[2] = 0.5;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
};

beforeEach(() => {
  resetPsychoedIndex();
  setPsychoedEmbedder(null as unknown as Embedder);
});

describe("retrievePsychoedForQuery", () => {
  it("returns a vetted snippet for a matching query when embedder is set", async () => {
    setPsychoedEmbedder(anxietyEmbedder);
    const snippet = await retrievePsychoedForQuery("anxiety and the body");
    expect(snippet).not.toBeNull();
    expect(snippet?.title.toLowerCase()).toContain("anxiety");
    expect(snippet?.summary.length).toBeGreaterThan(0);
    expect(snippet?.basis.length).toBeGreaterThan(0);
  });

  it("falls back to lexical search when no embedder is set", async () => {
    const snippet = await retrievePsychoedForQuery("panic attack");
    expect(snippet).not.toBeNull();
    expect(snippet?.title.toLowerCase()).toContain("panic");
  });

  it("returns null for empty query", async () => {
    setPsychoedEmbedder(mockEmbedder);
    expect(await retrievePsychoedForQuery("")).toBeNull();
  });

  it("returns null when the query matches nothing", async () => {
    setPsychoedEmbedder(mockEmbedder);
    expect(await retrievePsychoedForQuery("xyzzyplugh12345")).toBeNull();
  });
});

describe("psychoedContextBlock", () => {
  it("returns an empty string when no snippet is retrieved", () => {
    expect(psychoedContextBlock(null)).toBe("");
  });

  it("includes title, summary, basis, and a caution to use only when relevant", () => {
    const snippet: PsychoedSnippet = {
      title: "Test topic",
      summary: "A short summary.",
      basis: "A citation.",
    };
    const block = psychoedContextBlock(snippet);
    expect(block).toContain("Test topic");
    expect(block).toContain("A short summary.");
    expect(block).toContain("A citation.");
    expect(block.toLowerCase()).toContain("grounded");
    expect(block.toLowerCase()).toContain("ignore it");
  });
});

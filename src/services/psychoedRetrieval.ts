/**
 * Embedding-RAG psychoeducation retrieval.
 *
 * Reuses the same MiniLM-L6-v2 model already bundled for crisis classification.
 * On first query the 10 topics are embedded once and cached. Queries are embedded
 * at search time and ranked by cosine similarity (dot product on L2-normalized vectors).
 */
import type { Embedder } from "./crisisClassifier";
import { PSYCHOED_TOPICS, type PsychoedTopic } from "./psychoed";

export interface PsychoedResult {
  topic: PsychoedTopic;
  score: number;
}

let _embedder: Embedder | null = null;
let _topicEmbeddings: Float32Array[] | null = null;

/** Inject the embedder — call once at app startup. */
export function setPsychoedEmbedder(e: Embedder): void {
  _embedder = e;
  _topicEmbeddings = null; // bust cache when embedder changes
}

/** Reset cached embeddings — used in tests. */
export function resetPsychoedIndex(): void {
  _topicEmbeddings = null;
}

/** L2-normalize a vector in-place. */
function l2norm(v: number[]): number[] {
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= norm;
  return v;
}

/** Embed all topics once and cache. */
async function getTopicEmbeddings(): Promise<Float32Array[]> {
  if (_topicEmbeddings) return _topicEmbeddings;
  if (!_embedder) throw new Error("psychoed embedder not set — call setPsychoedEmbedder()");

  const texts = PSYCHOED_TOPICS.map(
    (t) => `${t.title} ${t.summary} ${t.tags.join(" ")}`,
  );
  const embeddings: Float32Array[] = [];
  for (const text of texts) {
    const raw = await _embedder(text);
    const normed = l2norm([...raw]);
    embeddings.push(new Float32Array(normed));
  }
  _topicEmbeddings = embeddings;
  return embeddings;
}

export interface SearchOptions {
  limit?: number;
  minScore?: number;
}

/**
 * Embedding-based search over the psychoeducation corpus.
 * Returns topics ranked by cosine similarity to the query.
 * Empty query returns the full corpus (browse mode, unranked).
 */
export async function embeddingSearchPsychoed(
  query: string,
  opts: SearchOptions = {},
): Promise<PsychoedResult[]> {
  const { limit = 10, minScore = 0 } = opts;
  const trimmed = query.trim();

  // Browse mode — no query → full corpus, score 1 (everything is "equally relevant")
  if (!trimmed) {
    return PSYCHOED_TOPICS.map((topic) => ({ topic, score: 1 }));
  }

  if (!_embedder) throw new Error("psychoed embedder not set — call setPsychoedEmbedder()");

  const [topicEmbeddings, queryRaw] = await Promise.all([
    getTopicEmbeddings(),
    _embedder(trimmed),
  ]);

  const queryVec = l2norm([...queryRaw]);

  // Dot product = cosine similarity on L2-normalized vectors
  const scored: PsychoedResult[] = PSYCHOED_TOPICS.map((topic, i) => {
    let dot = 0;
    const tv = topicEmbeddings[i];
    for (let j = 0; j < queryVec.length; j++) dot += queryVec[j] * tv[j];
    // Clamp to [0, 1] — negative similarity means irrelevant
    return { topic, score: Math.max(0, dot) };
  });

  return scored
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

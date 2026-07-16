/**
 * Embedding-RAG psychoeducation retrieval.
 *
 * Reuses the same MiniLM-L6-v2 model already bundled for crisis classification.
 * On first query the 10 topics are embedded once and cached. Queries are embedded
 * at search time and ranked by cosine similarity (dot product on L2-normalized vectors).
 */
import type { Embedder } from "./crisisClassifier";
import { PSYCHOED_TOPICS, type PsychoedTopic, searchPsychoed } from "./psychoed";

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
  _embedder = null;
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

export interface PsychoedSnippet {
  title: string;
  summary: string;
  basis: string;
}

const RAG_MIN_SCORE = 0.25;

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

/** Retrieve the single best-matching psychoeducation snippet for a query. Tries embedding RAG first,
 *  falls back to lexical search if the embedder is missing or errors, and returns null for empty/no-match
 *  queries so the model only sees grounded content when it honestly fits. */
export async function retrievePsychoedForQuery(query: string): Promise<PsychoedSnippet | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Try embedding RAG first (MiniLM retriever).
  try {
    const ranked = await embeddingSearchPsychoed(trimmed, { limit: 1, minScore: RAG_MIN_SCORE });
    if (ranked.length > 0) {
      const t = ranked[0].topic;
      return { title: t.title, summary: t.summary, basis: t.basis };
    }
  } catch {
    /* fall through to lexical search */
  }

  // Lexical fallback: deterministic, no model required.
  const lex = searchPsychoed(trimmed);
  if (lex.length > 0) {
    const t = lex[0];
    return { title: t.title, summary: t.summary, basis: t.basis };
  }

  return null;
}

/** Format a retrieved snippet as a system-prompt grounding block. Empty when there is nothing to say. */
export function psychoedContextBlock(snippet: PsychoedSnippet | null): string {
  if (!snippet) return "";
  return [
    "GROUNDED INFORMATION (vetted psychoeducation — only use if it fits what they're asking; never override their own experience):",
    `Topic: ${snippet.title}`,
    `Summary: ${snippet.summary}`,
    `Research basis: ${snippet.basis}`,
    "If this matches their question, you may draw on it briefly and in plain language. If it doesn't match, ignore it.",
  ].join("\n");
}

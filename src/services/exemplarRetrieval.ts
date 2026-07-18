/**
 * Exemplar-RAG: dynamic few-shot for the on-device 1B.
 *
 * A small model imitates examples far better than it obeys abstract rules. So instead of a fixed
 * persona blurb, we embed the user's message, retrieve the 1-2 NEAREST gold exchanges from the
 * companion-reply corpus (NILA_EXEMPLARS), and inject those `nila` replies as on-target demonstrations
 * of length + move + voice for THIS turn.
 *
 * Mirrors psychoedRetrieval.ts: same injected MiniLM embedder (the crisis embedder memoizes the last
 * user vector, so embedding here is ~free), embed-once-cache the corpus, cosine-rank at reply time.
 * Fail-open: any embedder absence/error yields no block — the persona's static examples still stand.
 *
 * The reply path retrieves with `diversify` on: it keeps the single nearest exemplar, then uses MMR
 * (relevance minus similarity to what's already picked, plus a same-tag penalty) and a stricter floor
 * for any further shot. So the 1B sees one strong on-target demo, and a second only when it clears a
 * higher bar AND shows a different angle — two near-duplicates or a weak filler no longer waste a slot.
 */
import type { Embedder } from "./crisisClassifier";
import { NILA_EXEMPLARS, type NilaExemplar } from "./nilaExemplars";

export interface ExemplarResult {
  exemplar: NilaExemplar;
  score: number;
}

/** Only inject when the nearest exemplar is genuinely on-topic — a bad match misleads the 1B more than
 *  no match. Tuned conservatively; the persona's static examples cover everything below this. */
const EXEMPLAR_MIN_SCORE = 0.3;

/** A SECOND demonstration must clear a higher bar than the first. One strong on-target shot teaches
 *  length+move+voice better than a strong shot paired with a barely-above-floor filler that pulls the
 *  1B off-target — so beyond the primary pick we stop unless the next candidate is genuinely close. */
const SECOND_SHOT_MIN_SCORE = 0.42;

/** MMR relevance/diversity tradeoff for multi-shot selection (higher = favour relevance). Two near-
 *  identical exemplars waste a slot; MMR picks a second that is on-topic AND shows a different angle. */
const MMR_LAMBDA = 0.72;

/** Small extra similarity charged when two candidates share a tag — nudges the second shot toward a
 *  different situation type so the pair demonstrates range, not the same move twice. */
const SAME_TAG_PENALTY = 0.12;

let _embedder: Embedder | null = null;
let _exemplarEmbeddings: Float32Array[] | null = null;

/** Inject the embedder — call once at app startup (share the crisis/psychoed MiniLM). */
export function setExemplarEmbedder(e: Embedder | null): void {
  _embedder = e;
  _exemplarEmbeddings = null; // bust cache when embedder changes
}

/** Reset cached corpus embeddings — used in tests. */
export function resetExemplarIndex(): void {
  _exemplarEmbeddings = null;
}

/** L2-normalize a vector in-place. */
function l2norm(v: number[]): number[] {
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= norm;
  return v;
}

/** Embed every corpus `user` turn once and cache. */
async function getExemplarEmbeddings(): Promise<Float32Array[]> {
  if (_exemplarEmbeddings) return _exemplarEmbeddings;
  if (!_embedder) throw new Error("exemplar embedder not set — call setExemplarEmbedder()");

  const embeddings: Float32Array[] = [];
  for (const ex of NILA_EXEMPLARS) {
    const raw = await _embedder(ex.user);
    embeddings.push(new Float32Array(l2norm([...raw])));
  }
  _exemplarEmbeddings = embeddings;
  return embeddings;
}

export interface SearchOptions {
  limit?: number;
  minScore?: number;
  /** If set, only return exemplars whose move matches one of these values. */
  moves?: string[];
  /** Diversify multi-shot output: pick the top match, then use MMR (relevance minus similarity-to-
   *  already-picked, with a same-tag penalty) plus a stricter floor for each further shot. Off by
   *  default so raw cosine ranking — and its tests — are unchanged; the reply path turns it on. */
  diversify?: boolean;
}

interface ScoredWithVec {
  exemplar: NilaExemplar;
  score: number;
  vec: Float32Array;
}

/** Cosine of two L2-normalized vectors is their dot product. */
function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/** Greedy MMR selection over an already relevance-sorted pool. Always keeps the top-1 (highest
 *  relevance); each further pick maximizes `λ·score − (1−λ)·maxSimToSelected` and must clear
 *  SECOND_SHOT_MIN_SCORE, so a weak or redundant filler is dropped rather than diluting the demo set. */
function mmrSelect(ranked: ScoredWithVec[], limit: number): ExemplarResult[] {
  if (ranked.length === 0 || limit <= 0) return [];
  const selected: ScoredWithVec[] = [ranked[0]];
  const pool = ranked.slice(1);

  while (selected.length < limit && pool.length > 0) {
    let bestIdx = -1;
    let bestMmr = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      let maxSim = 0;
      for (const s of selected) {
        let sim = cosine(c.vec, s.vec);
        if (c.exemplar.tag === s.exemplar.tag) sim += SAME_TAG_PENALTY;
        if (sim > maxSim) maxSim = sim;
      }
      const mmr = MMR_LAMBDA * c.score - (1 - MMR_LAMBDA) * maxSim;
      if (mmr > bestMmr) {
        bestMmr = mmr;
        bestIdx = i;
      }
    }
    const picked = pool.splice(bestIdx, 1)[0];
    // Beyond the first shot, a demonstration is only worth a slot if it is genuinely on-target.
    if (picked.score < SECOND_SHOT_MIN_SCORE) break;
    selected.push(picked);
  }
  return selected.map((s) => ({ exemplar: s.exemplar, score: s.score }));
}

/** Cosine-rank the corpus against a query. Throws if no embedder is set. */
export async function searchExemplars(
  query: string,
  opts: SearchOptions = {},
): Promise<ExemplarResult[]> {
  const { limit = 2, minScore = 0 } = opts;
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (!_embedder) throw new Error("exemplar embedder not set — call setExemplarEmbedder()");

  const [exemplarEmbeddings, queryRaw] = await Promise.all([
    getExemplarEmbeddings(),
    _embedder(trimmed),
  ]);
  const queryVec = new Float32Array(l2norm([...queryRaw]));

  const scored: ScoredWithVec[] = NILA_EXEMPLARS.map((exemplar, i) => {
    const ev = exemplarEmbeddings[i];
    return { exemplar, score: Math.max(0, cosine(queryVec, ev)), vec: ev };
  });

  let filtered = scored.filter((r) => r.score >= minScore);
  if (opts.moves && opts.moves.length > 0) {
    const moveSet = new Set(opts.moves);
    filtered = filtered.filter((r) => r.exemplar.move && moveSet.has(r.exemplar.move));
  }

  filtered.sort((a, b) => b.score - a.score);

  if (opts.diversify) return mmrSelect(filtered, limit);
  return filtered.slice(0, limit).map((r) => ({ exemplar: r.exemplar, score: r.score }));
}

/** Retrieve the top-k nearest exemplars above the confidence threshold. Fail-open: returns [] on empty
 *  query, missing embedder, or any error — the caller then simply injects nothing. */
export async function retrieveExemplarsForQuery(query: string, k = 2): Promise<NilaExemplar[]> {
  if (!query.trim()) return [];
  try {
    const ranked = await searchExemplars(query, { limit: k, minScore: EXEMPLAR_MIN_SCORE, diversify: true });
    return ranked.map((r) => r.exemplar);
  } catch {
    return [];
  }
}

/**
 * Move-aware retrieval: retrieve exemplars filtered by move type.
 *
 * Strategy: retrieve top-k *with* the move filter. If that yields < 1 result,
 * fall back to unfiltered retrieval (quality over move-matching). This ensures
 * the model always gets a good few-shot example even if the corpus is sparse
 * for a particular move.
 */
export async function retrieveExemplarsForMove(
  query: string,
  moves: string[],
  k = 2,
): Promise<NilaExemplar[]> {
  if (!query.trim()) return [];
  try {
    const moveFiltered = await searchExemplars(query, {
      limit: k,
      minScore: EXEMPLAR_MIN_SCORE,
      moves,
      diversify: true,
    });
    if (moveFiltered.length >= 1) return moveFiltered.map((r) => r.exemplar);
    // Fallback: unfiltered retrieval (move-matching is aspirational, not mandatory)
    return retrieveExemplarsForQuery(query, k);
  } catch {
    return [];
  }
}

/** Format retrieved exemplars as a system-prompt few-shot block. Empty when there is nothing to inject.
 *  Framed as illustration (not the current turn) and explicitly "don't copy" to curb verbatim echoing. */
export function exemplarFewShotBlock(exemplars: NilaExemplar[]): string {
  if (!exemplars.length) return "";
  // Label the reply "Nila:" (not "You:") and state the stance explicitly — a 1B otherwise mirrors the
  // examples in FIRST PERSON ("I've been avoiding...") as if the situation were its own. Speak AS Nila TO them.
  const lines = exemplars
    .map((ex) => `Them: "${ex.user}"\nNila: "${ex.nila}"`)
    .join("\n\n");
  return (
    "Here's how you (Nila) sound at your best on a message like this — match the length and the move, then " +
    "reply to what they actually said in the same spirit. Speak AS Nila, TO them: say \"you\" about their " +
    "situation, never \"I\" as if it were happening to you. Don't copy these lines:\n\n" +
    lines
  );
}

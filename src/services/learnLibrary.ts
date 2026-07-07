// Learn library (audit fix #8 — de-fragmentation). ONE §9-gated search over the three former reading
// libraries — Skills (coping how-tos), Understand (psychoeducation), and Why (the research behind features) —
// normalized to a single shape with a `source` facet. Pure, deterministic, on-device; no model, no network,
// no persistence. Lets a single "Learn" screen replace three screens + three search boxes without losing any
// content. Safety unchanged: a crisis query surfaces help (returns nothing) instead of library text.

import { filterSkills } from "./skillsLibrary";
import { searchPsychoed, checkPsychoedQuery } from "./psychoed";
import { embeddingSearchPsychoed } from "./psychoedRetrieval";
import { WHY_WE_BUILT_THIS, type FeatureArticle } from "../data/whyWeBuiltThis";

export type LearnSource = "skill" | "understand" | "why";

export interface LearnResult {
  id: string;          // "<source>:<originalId>" — stable, source-namespaced
  title: string;
  snippet: string;     // a short blurb for the card
  source: LearnSource;
  basis?: string;      // citation / research basis where the source carries one
}

/** Lexical match over the Why articles (which have no dedicated search fn). Empty query → all. */
function matchWhy(query: string): FeatureArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...WHY_WE_BUILT_THIS];
  return WHY_WE_BUILT_THIS.filter(
    (a) => a.title.toLowerCase().includes(q) || a.what.toLowerCase().includes(q) || a.why.toLowerCase().includes(q),
  );
}

/**
 * One search across all three reading sources. §9-gated FIRST: if the query reads as a crisis disclosure,
 * return nothing so the screen can surface help instead of reference text (checkPsychoedQuery === scanForCrisis;
 * true = crisis). Empty query returns the full merged library (browse mode). Never persists the query.
 *
 * Psychoeducation retrieval is embedding-augmented when the MiniLM embedder is available (RAG grounding
 * on clinical facts — kills hallucination). Falls back to lexical search on cold start or embedder error.
 */
export async function searchLearn(query: string): Promise<LearnResult[]> {
  if (checkPsychoedQuery(query)) return []; // crisis → help, not library content
  const q = query.trim();
  const out: LearnResult[] = [];
  for (const s of filterSkills(q, null)) {
    out.push({ id: `skill:${s.id}`, title: s.name, snippet: s.purpose, source: "skill", basis: s.basis });
  }
  // Embedding-RAG for psychoeducation (B4): try embedding retrieval, fall back to lexical
  let psychoedResults: { id: string; title: string; summary: string; basis: string }[];
  try {
    const ranked = await embeddingSearchPsychoed(q, { limit: 10 });
    psychoedResults = ranked.map((r) => r.topic);
  } catch {
    psychoedResults = searchPsychoed(q);
  }
  for (const t of psychoedResults) {
    out.push({ id: `understand:${t.id}`, title: t.title, snippet: t.summary, source: "understand", basis: t.basis });
  }
  for (const a of matchWhy(q)) {
    out.push({ id: `why:${a.id}`, title: a.title, snippet: a.what, source: "why" });
  }
  return out;
}

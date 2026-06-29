// On-device lexical retriever over the research-grounded skills corpus. Pure, deterministic, zero-dep.
// Sparse/lexical retrieval is the right tool for a small curated corpus (no embeddings/model needed).
import { SKILLS, findSkillInText, filterSkills, type Skill } from "./skillsLibrary";

export interface ScoredSkill {
  skill: Skill;
  score: number;
}

// Frozen stopword set — keep deterministic across instances (do not edit casually).
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "am", "was", "were", "of", "to", "for", "and", "or", "but",
  "in", "on", "at", "it", "i", "im", "my", "me", "we", "you", "your", "so", "that", "this",
  "with", "just", "really", "feel", "feeling",
]);

function tokenize(text: string): string[] {
  const matches: string[] = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return matches.filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

// Field weights: NAME is strongest, purpose next, everything else (incl. the acronym field) lowest.
// NOTE: the `acronym` field is a DESCRIPTIVE EXPANSION (e.g. GIVE → "Gentle · (act) Interested · …"),
// NOT a bare acronym — the short form (TIPP/GIVE/STOP) already lives in `name`. So index the acronym
// prose at weight 1 (recall only, like steps); weighting it 4 would let junk tokens ("act", "breathing")
// score name-level and falsely resolve via bestSkill.
const FIELD_WEIGHTS: Array<{ get: (s: Skill) => string; w: number }> = [
  { get: (s) => s.name, w: 4 },
  { get: (s) => s.purpose, w: 2 },
  { get: (s) => s.acronym ?? "", w: 1 },
  { get: (s) => s.modality, w: 1 },
  { get: (s) => s.group, w: 1 },
  { get: (s) => s.steps.join(" "), w: 1 },
];

interface Indexed {
  skill: Skill;
  weights: Map<string, number>;
}

const INDEX: Indexed[] = SKILLS.map((skill) => {
  const weights = new Map<string, number>();
  for (const f of FIELD_WEIGHTS) {
    for (const t of tokenize(f.get(skill))) {
      weights.set(t, Math.max(weights.get(t) ?? 0, f.w)); // a term counts once, at its highest-weight field
    }
  }
  return { skill, weights };
});

/** Rank the corpus by lexical relevance to a free-text query. Deterministic, offline, zero-dep. */
export function rankSkills(query: string, opts: { limit?: number; minScore?: number } = {}): ScoredSkill[] {
  const terms = new Set(tokenize(query));
  if (terms.size === 0) return [];
  const min = opts.minScore ?? 1; // default: drop zero-score (irrelevant)
  const scored: ScoredSkill[] = [];
  for (const { skill, weights } of INDEX) {
    let score = 0;
    for (const t of terms) score += weights.get(t) ?? 0;
    if (score >= min) scored.push({ skill, score });
  }
  scored.sort((a, b) => b.score - a.score); // stable sort → equal scores keep corpus order
  return typeof opts.limit === "number" ? scored.slice(0, opts.limit) : scored;
}

/** Top-1 above a confidence floor — a SAFE single-skill resolution (else null). */
export function bestSkill(query: string, minScore = 4): Skill | null {
  const top = rankSkills(query, { limit: 1, minScore })[0];
  return top ? top.skill : null;
}

/** Resolve a model-supplied skill_name to a skill. Exact name → confident lexical best → exact-in-text →
 *  null. The middle tier replaces the old dangerous bidirectional includes() (which could open a wrong
 *  skill); a low-signal name now falls through to null instead of guessing. */
export function resolveSkill(name: string): Skill | null {
  const n = (name || "").trim().toLowerCase();
  if (!n) return null;
  const exact = SKILLS.find((s) => s.name.toLowerCase() === n);
  if (exact) return exact;
  return bestSkill(name) ?? findSkillInText(name);
}

/** Ranked library search: same recall as filterSkills (substring set + group filter), but ordered by
 *  lexical relevance (desc), stable corpus-order tie-break. Empty query → unchanged filterSkills result. */
export function searchSkills(query: string, groupId: string | null): Skill[] {
  const matched = filterSkills(query, groupId);
  if (!query.trim()) return matched;
  const score = new Map(rankSkills(query, { minScore: 0 }).map((r) => [r.skill.id, r.score]));
  return [...matched].sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0));
}

/**
 * A compact, evidence-cited "most relevant skills" block to GROUND Nila's system prompt (RAG).
 * Returns "" when the query is empty or nothing relevant is found, so a caller stays byte-identical to
 * the no-query path. ADDITIVE only — the full skills list is still shown separately, so Nila never
 * loses access to a skill; this just surfaces the best-matched, research-cited ones for the moment.
 * Wording is deliberately conditional ("only if … they already feel heard") to respect the persona
 * rule that a skill is offered only after the person feels heard.
 */
export function relevantSkillsBlock(query: string, limit = 3): string {
  const top = rankSkills(query, { limit, minScore: 1 });
  if (top.length === 0) return "";
  const lines = top
    .map(({ skill }) => {
      const cite = skill.basis.split(/[,—;(]/)[0].trim(); // first author/year from the basis citation
      return `- ${skill.name} — ${skill.purpose}${cite ? ` (${cite})` : ""}`;
    })
    .join("\n");
  return `MOST RELEVANT TO WHAT THEY JUST SHARED — only if a skill would genuinely help and they already feel heard, prefer one of these:\n${lines}`;
}

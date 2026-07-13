// Schema + anti-collapse checks for docs/nila-corpus/seed.jsonl, run over the generated NILA_EXEMPLARS.
// errors = hard failures (fix before regenerating); warnings = balance drift (rebalance when the corpus grows).
import type { NilaExemplar } from "./nilaExemplars";

export interface CorpusValidationReport {
  errors: string[];
  warnings: string[];
}

function sentenceCount(text: string): number {
  const matches = text.trim().match(/[.!?]+(\s|$)/g);
  return matches ? matches.length : text.trim() ? 1 : 0;
}

export function validateCorpus(exemplars: NilaExemplar[]): CorpusValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const seenIds = new Set<string>();
  const seenUsers = new Set<string>();
  const tagCounts = new Map<string, number>();
  const moveCounts = new Map<string, number>();
  let questionEnders = 0;

  for (const ex of exemplars) {
    if (!ex.user.trim() || !ex.nila.trim()) {
      errors.push(`${ex.id}: empty user or nila field`);
      continue;
    }
    if (seenIds.has(ex.id)) errors.push(`${ex.id}: duplicate id`);
    seenIds.add(ex.id);

    const userKey = ex.user.trim().toLowerCase();
    if (seenUsers.has(userKey)) errors.push(`${ex.id}: duplicate user turn "${ex.user}"`);
    seenUsers.add(userKey);

    const sentences = sentenceCount(ex.nila);
    if (sentences > 3) errors.push(`${ex.id}: nila reply has ${sentences} sentences (max 3)`);

    tagCounts.set(ex.tag, (tagCounts.get(ex.tag) ?? 0) + 1);
    if (ex.move) moveCounts.set(ex.move, (moveCounts.get(ex.move) ?? 0) + 1);
    if (/[?？]\s*$/.test(ex.nila.trim())) questionEnders++;
  }

  const total = exemplars.length || 1;
  for (const [tag, count] of tagCounts) {
    if (count / total > 0.3) {
      warnings.push(`tag "${tag}" is ${Math.round((count / total) * 100)}% of the corpus (cap ~30%)`);
    }
  }
  for (const [move, count] of moveCounts) {
    if (count / total > 0.3) {
      warnings.push(`opening_move "${move}" is ${Math.round((count / total) * 100)}% of the corpus (cap ~30%)`);
    }
  }
  const questionRatio = questionEnders / total;
  if (questionRatio > 0.7 || questionRatio < 0.3) {
    warnings.push(
      `ends_in_question ratio is ${Math.round(questionRatio * 100)}% (target ~50/50, healthy range 30-70%)`,
    );
  }

  return { errors, warnings };
}

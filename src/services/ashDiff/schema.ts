// The Ash-diff dataset row + validator. One row per probe: Ash's reply, Nila's current reply, the labeled
// delta, and the authored gold_nila. The gold serves triple duty: eval gold, RAG exemplar, fine-tune seed.
// Validation mirrors nilaCorpusValidate.ts (schema + anti-collapse) but over the ash-diff dataset.
import type { MoveKind, TurnKind } from "../moveEval/rubric";

export interface AshDiffRow {
  id: string;
  tag: string;
  register: string;
  lang: string;
  probe: string;
  ashReply: string;
  nilaReplyCurrent: string;
  moveLabels: { name: 0 | 1; move: MoveKind; turn: TurnKind; sentences: number };
  delta: string;
  /** the authored ideal Nila reply — the training/eval target. Never raw teacher output. */
  goldNila: string;
}

export interface AshDiffReport {
  errors: string[];
  warnings: string[];
}

/** Count sentence-final punctuation runs. Shared shape with nilaCorpusValidate.sentenceCount. */
function sentenceCount(text: string): number {
  const matches = text.trim().match(/[.!?]+(\s|$)/g);
  return matches ? matches.length : text.trim() ? 1 : 0;
}

const TAG_CAP = 0.3;
const REGISTER_CAP = 0.3;

export function validateAshDiff(rows: AshDiffRow[]): AshDiffReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const seenIds = new Set<string>();
  const tagCounts = new Map<string, number>();
  const registerCounts = new Map<string, number>();
  let questionEnders = 0;

  for (const r of rows) {
    if (!r.probe.trim() || !r.goldNila.trim()) {
      errors.push(`${r.id}: empty probe or goldNila`);
      continue;
    }
    if (seenIds.has(r.id)) errors.push(`${r.id}: duplicate id`);
    seenIds.add(r.id);

    const s = sentenceCount(r.goldNila);
    if (s > 3) errors.push(`${r.id}: goldNila has ${s} sentences (max 3)`);

    tagCounts.set(r.tag, (tagCounts.get(r.tag) ?? 0) + 1);
    registerCounts.set(r.register, (registerCounts.get(r.register) ?? 0) + 1);
    if (/[?？]\s*$/.test(r.goldNila.trim())) questionEnders++;
  }

  const total = rows.length || 1;
  for (const [tag, count] of tagCounts) {
    if (count / total > TAG_CAP) {
      warnings.push(`tag "${tag}" is ${Math.round((count / total) * 100)}% of the set (cap ~30%)`);
    }
  }
  for (const [register, count] of registerCounts) {
    if (count / total > REGISTER_CAP) {
      warnings.push(`register "${register}" is ${Math.round((count / total) * 100)}% of the set (cap ~30%)`);
    }
  }
  const questionRatio = questionEnders / total;
  if (questionRatio > 0.7 || questionRatio < 0.3) {
    warnings.push(
      `goldNila question-ending ratio is ${Math.round(questionRatio * 100)}% (target ~50/50, healthy 30-70%)`,
    );
  }

  return { errors, warnings };
}

// Generate src/services/nilaExemplars.ts from the corpus source of truth (docs/nila-corpus/seed.jsonl).
// Keeps the app's retrieval set in lockstep with the fine-tune export — no hand-editing, no drift.
// Run: node scripts/gen-exemplars.mjs
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "docs/nila-corpus/seed.jsonl";
const OUT = "src/services/nilaExemplars.ts";

const rows = readFileSync(SRC, "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((l, i) => {
    let o;
    try {
      o = JSON.parse(l);
    } catch (e) {
      throw new Error(`seed.jsonl line ${i + 1} is not valid JSON: ${e.message}`);
    }
    if (!o.id || !o.tag || !o.user || !o.nila) {
      throw new Error(`seed.jsonl line ${i + 1} missing id/tag/user/nila`);
    }
    // move/register are optional alliance-voice metadata (2026-07-12 wave 2) — pass through when present,
    // omit the key entirely otherwise so older rows without them stay byte-identical.
    const row = { id: o.id, tag: o.tag, user: o.user, nila: o.nila };
    if (o.move) row.move = o.move;
    if (o.register) row.register = o.register;
    return row;
  });

const body = rows.map((r) => "  " + JSON.stringify(r) + ",").join("\n");
const out =
  `// GENERATED from ${SRC} by scripts/gen-exemplars.mjs — do not edit by hand.\n` +
  `// Regenerate after editing the corpus: node scripts/gen-exemplars.mjs\n` +
  `//\n` +
  `// Nila's companion-reply exemplars: the retrieval set for exemplar-RAG (embed \`user\`,\n` +
  `// retrieve the nearest, inject \`nila\` as dynamic few-shot) and the seed for fine-tuning.\n` +
  `export interface NilaExemplar {\n` +
  `  /** stable id, mirrors seed.jsonl */\n  id: string;\n` +
  `  /** situation type (taxonomy) */\n  tag: string;\n` +
  `  /** the user turn — the retrieval key (embedded) */\n  user: string;\n` +
  `  /** the gold reply — injected as the example to imitate */\n  nila: string;\n` +
  `  /** conversational move (e.g. "validate+challenge-one-question") — alliance-voice metadata, not yet\n` +
  `   *  consumed by retrieval; forward-prep for the Wave-3 register-aware filter. Optional: older rows may lack it. */\n  move?: string;\n` +
  `  /** intensity register (e.g. "mild"/"moderate"/"distressed") — alliance-voice metadata, not yet\n` +
  `   *  consumed by retrieval; forward-prep for the Wave-3 register-aware filter, per Son, Koo, Zi, Jang &\n` +
  `   *  Lim (2026), Expert Systems with Applications (register mismatch lowers perceived support). Optional. */\n  register?: string;\n` +
  `}\n\n` +
  `export const NILA_EXEMPLARS: NilaExemplar[] = [\n${body}\n];\n`;

writeFileSync(OUT, out);
console.log(`wrote ${rows.length} exemplars -> ${OUT}`);

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

/**
 * §9 SEALED-BOUNDARY CONTRACT (Phase 2 of the re-architecture).
 *
 * safety.ts is the crisis-safety module. Only a small PUBLIC surface may be imported
 * by application code; the keyword/cue corpora and isBenign* guards are §9-INTERNAL —
 * importing them into feature code invites a second, drifting copy of the detection
 * logic (the exact bug class §9 exists to prevent).
 *
 * This test fails if any file OUTSIDE the safety subsystem imports a non-public symbol
 * from "safety". Adding a new import of an internal symbol is a deliberate act: either
 * it is truly public (add it to PUBLIC_SAFETY_API below, with review) or the importer
 * is a subsystem member (add it to SAFETY_SUBSYSTEM, with review). No silent drift.
 */

// The ONLY symbols application code may import from safety.ts.
const PUBLIC_SAFETY_API = new Set([
  "scanForCrisis",
  "getCrisisReply",
  "getUnsafeFallbackReply",
  "checkResponse",
  "isStreamingHarm",
]);

// Files that ARE the safety subsystem — permitted to compose §9 internals.
// Relative to src/. Keep this list tight; every entry is a reviewed exception.
const SAFETY_SUBSYSTEM = new Set([
  "safety.ts",
  "services/crisisClassifier.ts",
]);

const SRC_DIR = fileURLToPath(new URL(".", import.meta.url));

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules") continue;
      out.push(...walk(full));
    } else if (/\.tsx?$/.test(name) && !/\.d\.ts$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

// Matches `import { a, b } from "…/safety"` (specifier ending exactly in `safety`,
// not safetyPlan / nilaSafetyGate / a safety/ subpath). Brace body may span lines.
const SAFETY_IMPORT = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["'](?:[^"']*\/)?safety["']/g;

function importedSymbols(source: string): string[] {
  const names: string[] = [];
  for (const m of source.matchAll(SAFETY_IMPORT)) {
    for (const raw of m[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name) names.push(name);
    }
  }
  return names;
}

describe("§9 sealed boundary — safety.ts public surface", () => {
  const files = walk(SRC_DIR);

  it("finds the src tree (sanity)", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("every PUBLIC_SAFETY_API name is actually exported by safety.ts (catches renames)", () => {
    const src = readFileSync(join(SRC_DIR, "safety.ts"), "utf8");
    const exported = new Set(
      [...src.matchAll(/^export\s+(?:function|const)\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1]),
    );
    for (const name of PUBLIC_SAFETY_API) {
      expect(exported, `public symbol "${name}" no longer exported by safety.ts`).toContain(name);
    }
  });

  it("no non-subsystem file imports a §9-internal symbol from safety.ts", () => {
    const violations: string[] = [];
    for (const file of files) {
      const rel = relative(SRC_DIR, file);
      if (SAFETY_SUBSYSTEM.has(rel)) continue;
      if (/\.test\.tsx?$/.test(rel)) continue; // tests may exercise internals directly
      for (const name of importedSymbols(readFileSync(file, "utf8"))) {
        if (!PUBLIC_SAFETY_API.has(name)) {
          violations.push(`${rel} imports non-public "${name}" from safety`);
        }
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });
});

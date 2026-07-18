import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { SECURE_KEYS } from "./secureData";

/**
 * CANONICAL-KEY WRITE BOUNDARY (Phase 1 write-half lock-in).
 *
 * The keys in SECURE_KEYS are owned by the typed data layer: reads go through
 * loadSecure*, writes through writeSecure* / updateSecure* / appendToSecureArray.
 * A raw `secureLocal.setItem(<canonical key>, …)` at a feature site is the exact
 * pattern that produced the DiaryCard "one save wipes the whole map on a corrupt
 * blob" data-loss bug — and a `localStorage.setItem(<canonical key>, …)` would
 * additionally bypass encryption on a SENSITIVE key. This test fails if any file
 * outside the data layer writes a canonical key directly.
 *
 * Detection anchors on a `.setItem(` CALL whose first argument is a canonical key
 * (either a raw "nilamind_*" literal or a `SECURE_KEYS.*` reference). That is
 * deliberately narrow: it never flags a module that merely NAMES a key (readers),
 * nor a legitimate setItem on a NON-canonical key. The sanctioned writers
 * (writeSecure* / updateSecure* / appendToSecureArray) don't match `.setItem(`.
 *
 * This is a TRIPWIRE, not a sandbox: import-aliasing (`const s = secureLocal`) or
 * building the key at runtime can defeat a static scan. It catches the honest
 * mistake — a new capture screen hand-rolling a write — which is what erodes seams.
 */

// src/services/ -> src/
const SRC_DIR = fileURLToPath(new URL("..", import.meta.url));

// The only files permitted to write a canonical key: secureData owns the typed
// writers; secureLocal owns setItem itself + the appendToSecureArray primitive.
const WRITE_ALLOWLIST = new Set(["services/secureData.ts", "services/secureLocal.ts"]);

const KEY_VALUES = Object.values(SECURE_KEYS);
const KEY_NAMES = Object.keys(SECURE_KEYS);

// `.setItem( "nilamind_x"  |  'nilamind_x'  |  SECURE_KEYS.x  ,` — a write call
// whose key argument is canonical, on any receiver (secureLocal, localStorage, …).
const CANONICAL_WRITE = new RegExp(
  `\\.setItem\\s*\\(\\s*(?:${[
    ...KEY_VALUES.map((v) => `"${v}"`),
    ...KEY_VALUES.map((v) => `'${v}'`),
    ...KEY_NAMES.map((n) => `SECURE_KEYS\\.${n}`),
  ].join("|")})\\s*[,)]`,
);

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

describe("canonical-key write boundary — only the data layer writes SECURE_KEYS", () => {
  it("the detector bites, and passes a mere key mention (self-check)", () => {
    expect(CANONICAL_WRITE.test(`secureLocal.setItem("${KEY_VALUES[0]}", JSON.stringify(x))`)).toBe(true);
    expect(CANONICAL_WRITE.test(`localStorage.setItem(SECURE_KEYS.${KEY_NAMES[0]}, v)`)).toBe(true);
    // reader naming the key, and the sanctioned writers, must NOT trip it:
    expect(CANONICAL_WRITE.test(`loadSecureArray("${KEY_VALUES[0]}")`)).toBe(false);
    expect(CANONICAL_WRITE.test(`appendToSecureArray(SECURE_KEYS.${KEY_NAMES[0]}, item)`)).toBe(false);
    expect(CANONICAL_WRITE.test(`updateSecureRecord(SECURE_KEYS.${KEY_NAMES[0]}, fn)`)).toBe(false);
  });

  it("no file outside the data layer writes a canonical key via setItem", () => {
    const violations: string[] = [];
    for (const file of walk(SRC_DIR)) {
      const rel = relative(SRC_DIR, file);
      if (WRITE_ALLOWLIST.has(rel)) continue;
      if (/\.test\.tsx?$/.test(rel)) continue;
      if (CANONICAL_WRITE.test(readFileSync(file, "utf8"))) {
        violations.push(`${rel} writes a canonical SECURE_KEY via raw setItem`);
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });
});

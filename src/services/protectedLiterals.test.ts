import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

// Resolve the repo's src/ relative to THIS test file (src/services/protectedLiterals.test.ts),
// so the guard works regardless of the cwd vitest is invoked from.
const HERE = dirname(fileURLToPath(import.meta.url)); // .../src/services
const SRC = resolve(HERE, "..");                       // .../src

const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

/** Recursively collect every .ts/.tsx file under src/ (skips this test's own dir of test files only by extension). */
function allSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      allSourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

// The 23 protected sensitive keys, in declaration order (src/services/secureLocal.ts).
const SENSITIVE_KEYS = [
  "nilamind_checkins",
  "nilamind_diary",
  "nilamind_episodes",
  "nilamind_thought_records",
  "nilamind_safetyplan",
  "nilamind_critic_logs",
  "nilamind_compassionate_letters",
  "nilamind_shame_protect_logs",
  "nilamind_assessments",
  "nilamind_values",
  "nilamind_values_actions",
  "nilamind_ba_activities",
  "nilamind_home_coords",
  "nilamind_nila_sessions",
  "nilamind_nila_memory",
  "nilamind_identity",
  "nilamind_nila_insights",
  "nilamind_nila_insights_removed",
  "nilamind_inflection",
  "nilamind_profile_facts",
  "nilamind_active_focus",
  "nilamind_feedback",
  "nilamind_donations",
];

describe("protected literals (privacy/encryption invariants — never change)", () => {
  it("identity.ts still contains the exact PBKDF2 backup salt", () => {
    const src = read("services/identity.ts");
    expect(src).toContain('"mindanchor-backup-v1"');
  });

  it("widgetSync.ts still writes the 3 native-widget Preferences keys verbatim", () => {
    const src = read("services/widgetSync.ts");
    expect(src).toContain('"ma_widget_streak"');
    expect(src).toContain('"ma_widget_label"');
    expect(src).toContain('"ma_widget_emoji"');
  });

  it("secureLocal.ts SENSITIVE_KEYS contains exactly the 23 expected entries", () => {
    const src = read("services/secureLocal.ts");
    // Pull the array body out of `export const SENSITIVE_KEYS = [ ... ];`
    const m = src.match(/export const SENSITIVE_KEYS\s*=\s*\[([\s\S]*?)\]/);
    expect(m, "SENSITIVE_KEYS array literal not found").toBeTruthy();
    const found = [...m![1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    expect(found).toEqual(SENSITIVE_KEYS);
    expect(found).toHaveLength(23);
    // The reflection throttle flag is a non-sensitive date-only value in plain localStorage.
    expect(found).not.toContain("nilamind_last_reflected");
    // Phase 2 inflection: the toggle + throttle + daily-cap are non-sensitive flag/date values.
    expect(found).not.toContain("nilamind_inflection_enabled");
    expect(found).not.toContain("nilamind_inflection_checked");
    expect(found).not.toContain("nilamind_inflection_surfaced");
  });

  it("no src file writes a SENSITIVE key through raw window.localStorage.setItem", () => {
    const offenders: string[] = [];
    for (const file of allSourceFiles(SRC)) {
      // secureLocal.ts is the ONE legitimate place that touches window.localStorage
      // (PASSTHROUGH fail-safe); it never targets a specific sensitive key literal.
      if (file.endsWith("/services/secureLocal.ts")) continue;
      const text = readFileSync(file, "utf8");
      for (const key of SENSITIVE_KEYS) {
        // match  localStorage.setItem("<key>"  or  window.localStorage.setItem("<key>"
        const re = new RegExp(`localStorage\\.setItem\\(\\s*["'\`]${key}["'\`]`);
        if (re.test(text)) offenders.push(`${file} → ${key}`);
      }
    }
    expect(offenders, `sensitive keys written via raw localStorage:\n${offenders.join("\n")}`).toEqual([]);
  });
});

/**
 * Property-based tests for the §9 crisis-safety boundary.
 *
 * These complement the example-based tests in safety.test.ts / safety.boundary.test.ts.
 * They exercise invariants the example-based tests can't reach — arbitrary unicode,
 * weird whitespace, huge strings — which is exactly the failure mode the safety
 * layer must not have. A throw on a random input is a real safety hole: the
 * crisis path would silently break for some users.
 *
 * Scope (deliberately narrow — over-constraining property tests produce false alarms
 * and erode trust in the safety layer):
 *   1. scanForCrisis is deterministic on arbitrary input
 *   2. scanForCrisis, checkResponse, isStreamingHarm NEVER throw on any string
 *   3. scanForCrisis returns false for the empty string and for whitespace-only
 *   4. scanForCrisis is invariant under .trim() (whitespace normalization is the
 *      module's job, not the caller's)
 *   5. The keyword floor catches any input that contains a SUICIDAL_KEYWORDS
 *      entry as a substring — this is the "ADDITIVE / unsuppressible floor"
 *      promise that the whole §9 design rests on
 *   6. SUICIDAL_KEYWORDS, SLANG_IDEATION, ROMANIZED_IDEATION contain no empty
 *      or whitespace-only entries (a stray "" would silently match every input)
 *
 * NOT tested here (deliberately — would over-constrain):
 *   - Benign-phrase handling. The implementation has isBenign* guards that
 *     intentionally allow some false positives on certain patterns; a property
 *     like "no crisis detection on benign inputs" would be too strict.
 *   - checkResponse return values. The full Rules 1–6 are covered by
 *     example-based tests in safety.test.ts; property-testing them is hard
 *     without leaking implementation details.
 *
 * See AGENTS.md "Guardrails against reward-hacking" — these tests must not be
 * weakened to make them pass. If a property fails, the implementation is
 * wrong; do not edit the property.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  scanForCrisis,
  checkResponse,
  isStreamingHarm,
  SUICIDAL_KEYWORDS,
  SLANG_IDEATION,
  ROMANIZED_IDEATION,
} from "./safety";

// An explicit set of "interesting" unicode codepoints that have actually
// broken text-handling code: emoji (surrogate pairs), RTL overrides, zero-width
// joiners/spaces, non-breaking space, soft hyphen, BOM, line/paragraph separators.
// This is more useful than pure random unicode because it pins the specific
// failure modes the safety layer has to survive.
const WEIRD_UNICODE = [
  "\u200B", // zero-width space
  "\u200C", // zero-width non-joiner
  "\u200D", // zero-width joiner
  "\uFEFF", // BOM / zero-width no-break space
  "\u00A0", // non-breaking space
  "\u2009", // thin space
  "\u2028", // line separator
  "\u2029", // paragraph separator
  "\u202E", // right-to-left override
  "\u202D", // left-to-right override
  "\u200F", // right-to-left mark
  "\u200E", // left-to-right mark
  "\u00AD", // soft hyphen
  "\uD83D\uDE00", // 😀 (surrogate pair)
  "\uD83C\uDF89", // 🎉 (surrogate pair)
  "\uD83D\uDC68\u200D\uD83D\uDCBB", // 👨‍💻 (ZWJ sequence)
  "\uD842\uDF9F", // CJK surrogate pair (𠮟)
  "\u0301", // combining acute accent
  "\u0300", // combining grave accent
  "\u0303", // combining tilde
  "\u0901", // Devanagari sign candrabindu (relevant: India-first app)
  "\u0C00", // Telugu sign combining
];

// fast-check v4 removed `fc.unicodeString`; build a string generator from a
// fixed unit instead. This is more useful anyway — it tests the actual edge
// cases we care about, not arbitrary random unicode that's mostly printable.
const weirdString = (): fc.Arbitrary<string> =>
  fc.string({ unit: fc.constantFrom(...WEIRD_UNICODE, ...Array.from("abcdefghijklmnop \t\n\r-")), minLength: 0, maxLength: 200 });

describe("§9 — property-based safety invariants", () => {
  it("scanForCrisis is deterministic on arbitrary input", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(scanForCrisis(s)).toBe(scanForCrisis(s));
      }),
      { numRuns: 200 }
    );
  });

  it("scanForCrisis never throws on arbitrary ASCII input", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(() => scanForCrisis(s)).not.toThrow();
      }),
      { numRuns: 300 }
    );
  });

  it("scanForCrisis never throws on weird-unicode input (emoji, RTL, zero-width, etc.)", () => {
    fc.assert(
      fc.property(weirdString(), (s) => {
        expect(() => scanForCrisis(s)).not.toThrow();
      }),
      { numRuns: 200 }
    );
  });

  it("checkResponse never throws on arbitrary (reply, message) pairs", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (reply, message) => {
        expect(() => checkResponse(reply, message)).not.toThrow();
        // Also exercise the userInCrisis=true branch — the crisis path must
        // also be total on its input.
        expect(() => checkResponse(reply, message, true)).not.toThrow();
        expect(() => checkResponse(reply, message, false)).not.toThrow();
      }),
      { numRuns: 200 }
    );
  });

  it("isStreamingHarm never throws on arbitrary input (cuts the LIVE stream — must be total)", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(() => isStreamingHarm(s)).not.toThrow();
      }),
      { numRuns: 300 }
    );
  });

  it("scanForCrisis returns false for empty / whitespace-only input", () => {
    expect(scanForCrisis("")).toBe(false);
    fc.assert(
      fc.property(fc.constantFrom(" ", "  ", "\t", "\n", "\r\n", " \t \n "), (ws) => {
        expect(scanForCrisis(ws)).toBe(false);
      })
    );
  });

  it("scanForCrisis is invariant under .trim() (whitespace is the module's job)", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(scanForCrisis(s)).toBe(scanForCrisis(s.trim()));
      }),
      { numRuns: 200 }
    );
  });

  it("the keyword floor catches any string containing a SUICIDAL_KEYWORDS entry as a substring", () => {
    // The §9 design rests on this: the deterministic keyword floor is the
    // unsuppressible safety gate. If a paraphrase contains a known keyword
    // verbatim, it must be detected — no matter what surrounds it.
    fc.assert(
      fc.property(
        fc.constantFrom(...SUICIDAL_KEYWORDS),
        fc.string(), // prefix
        fc.string(), // suffix
        (keyword, prefix, suffix) => {
          const input = prefix + keyword + suffix;
          expect(scanForCrisis(input)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("SUICIDAL_KEYWORDS, SLANG_IDEATION, ROMANIZED_IDEATION contain no empty or whitespace-only entries", () => {
    // A stray "" in any of these lists would match every input.
    for (const list of [SUICIDAL_KEYWORDS, SLANG_IDEATION, ROMANIZED_IDEATION]) {
      for (const entry of list) {
        expect(typeof entry).toBe("string");
        expect(entry.length).toBeGreaterThan(0);
        expect(entry.trim().length).toBeGreaterThan(0);
      }
    }
  });
});


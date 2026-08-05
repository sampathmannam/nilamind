/**
 * THE single text normalizer shared by every safety-adjacent keyword/pattern scanner (safety.ts,
 * elevationGuard.ts, distortionSpotter.ts).
 *
 * Lowercase; strip zero-width chars FIRST (U+200B-200D, U+FEFF) so an injected zero-width space cannot
 * split a keyword; unify the typographic apostrophe U+2019 to ASCII apostrophe; collapse all internal
 * whitespace so a multi-word phrase still matches across a line break.
 *
 * Originally introduced inside safety.ts (2026-08-03, audit OG-3/OG-5) after this exact normalization
 * had been copy-pasted nine times and drifted (checkResponse Rules 3/5/6/7 not normalizing at all, and a
 * two-ASCII-apostrophe typo silently disabling isBenignHeartbreakIdiom/isBenignHelpSeeking on any text
 * with a real U+2019 apostrophe, which iOS/Gboard emit by default). Extracted into its own module
 * (2026-08-05 audit) because elevationGuard.ts and distortionSpotter.ts had ALREADY drifted a second
 * time (missing the zero-width strip; elevationGuard also still had the two-ASCII-apostrophe typo,
 * fixed by this extraction) -- safety.ts is a sealed §9 boundary that already imports
 * distortionSpotter.ts, so those two files importing normalizeText FROM safety.ts would both violate
 * the boundary contract (src/safety.boundary.test.ts) and create a circular import. A dependency-free
 * shared module is the only place all three can import from without either problem.
 */
// Built from code points (not literal \uXXXX regex escapes) to guarantee these exact characters:
// zero-width space, zero-width non-joiner, zero-width joiner, zero-width no-break space (BOM), and the
// Unicode right single quotation mark -- never accidentally an unescaped literal invisible character.
const ZERO_WIDTH_CHARS = [0x200b, 0x200c, 0x200d, 0xfeff].map((code) => String.fromCharCode(code)).join("");
const ZERO_WIDTH_RE = new RegExp(`[${ZERO_WIDTH_CHARS}]`, "g");
const CURLY_APOSTROPHE = String.fromCharCode(0x2019);
const CURLY_APOSTROPHE_RE = new RegExp(`['${CURLY_APOSTROPHE}]`, "g");

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(ZERO_WIDTH_RE, "")
    .replace(CURLY_APOSTROPHE_RE, "'")
    .replace(/\s+/g, " ")
    .trim();
}
